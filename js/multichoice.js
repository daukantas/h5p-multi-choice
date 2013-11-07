// Will render a Question with multiple choices for answers.

// Options format:
// {
//   title: "Optional title for question box",
//   question: "Question text",
//   answers: [{text: "Answer text", correct: false}, ...],
//   singleAnswer: true, // or false, will change rendered output slightly.
//   singlePoint: true,  // True if question give a single point score only
//                       // if all are correct, false to give 1 point per
//                       // correct answer. (Only for singleAnswer=false)
//   randomAnswers: false  // Whether to randomize the order of answers.
// }
//
// Events provided:
// - h5pQuestionAnswered: Triggered when a question has been answered.

var H5P = H5P || {};

H5P.MultiChoice = function(options, contentId) {
  var that = this;
  if (!(this instanceof H5P.MultiChoice))
    return new H5P.MultiChoice(options, contentId);

  var $ = H5P.jQuery;
  var lp = H5P.getLibraryPath('H5P.MultiChoice-1.0');

  var texttemplate =
          '<div class="h5p-question"><%= question %></div>' +
          '<form>' +
          '  <ul class="h5p-answers">' +
          '    <% for (var i=0; i<answers.length; i++) { %>' +
          '      <li class="h5p-answer<% if (userAnswers.indexOf(i) > -1) { %> h5p-selected<% } %>">' +
          '        <label>' +
          '          <div class="h5p-input-container">' +
          '            <% if (singleAnswer) { %>' +
          '            <input type="radio" name="answer" class="h5p-input" value="answer_<%= i %>"<% if (userAnswers.indexOf(i) > -1) { %> checked<% } %> />' +
          '            <% } else { %>' +
          '            <input type="checkbox" name="answer_<%= i %>" class="h5p-input" value="answer_<%= i %>"<% if (userAnswers.indexOf(i) > -1) { %> checked<% } %> />' +
          '            <% } %>' +
          '            <a width="100%" height="100%" class="h5p-radio-or-checkbox" href="#"><%= answers[i].checkboxOrRadioImgPath %></a>' +
          '          </div><div class="h5p-alternative-container">' +
          '            <span class="h5p-span"><%= answers[i].text %></span>' +
          '          </div><div class="h5p-clearfix"></div>' +
          '        </label>' +
          '      </li>' +
          '    <% } %>' +
          '  </ul>' +
          '</form>' +
          '<div class="h5p-show-solution-container"><div class="feedback-text"></div><a href="#" class="h5p-show-solution"><%= UI.showSolutionButton %></a></div>';

  var defaults = {
    question: "No question text provided",
    answers: [
      {text: "Answer 1", correct: false},
      {text: "Answer 2", correct: true}
    ],
    singleAnswer: false,
    singlePoint: true,
    randomAnswers: false,
    weight: 1,
    userAnswers: [],
    UI: {
      showSolutionButton: 'Show solution',
      tryAgainButton: 'Try again',
      correctText: 'Correct!',
      almostText: 'Almost!',
      wrongText: 'Wrong!'
    },
    displaySolutionsButton: true,
    postUserStatistics: (H5P.postUserStatistics === true),
    tryAgain: true
  };
  var template = new EJS({text: texttemplate});
  var params = $.extend(true, {}, defaults, options);

  var getCheckboxOrRadioImgPath = function(radio, selected) {
    var toReturn;
    if (radio) {
      toReturn = selected ? '&#xe603;' : '&#xe600;';
    }
    else {
      toReturn = selected ? '&#xe601;' : '&#xe602;';
    }
    return toReturn;
  };

  for (var i = 0; i < params.answers.length; i++) {
    params.answers[i].checkboxOrRadioImgPath = getCheckboxOrRadioImgPath(params.singleAnswer, params.userAnswers.indexOf(i) > -1);
  }

  var $myDom;
  var $solutionButton;
  var $feedbackElement;

  var answerGiven = false;
  var score = 0;
  var solutionsVisible = false;

  var showSolutions = function () {
    if (solutionsVisible) {
      return;
    }

    if ($solutionButton !== undefined) {
      if (params.tryAgain) {
        $solutionButton.text(params.UI.tryAgainButton).addClass('h5p-try-again');
      }
      else {
        $solutionButton.remove();
      }
    }

    solutionsVisible = true;
    $myDom.find('.h5p-answer').each(function (i, e) {
      var $e = H5P.jQuery(e);
      if (params.answers[i].correct) {
        $e.addClass('h5p-correct');
      }
      else {
        $e.addClass('h5p-wrong');
      }
      $e.find('input').attr('disabled', 'disabled');
    });
    var max = maxScore();
    if (score === max) {
      //$('<div class="h5p-passed">' + params.UI.correctText + '</div>').prependTo($myDom.find('.h5p-show-solution-container'));
      $feedbackElement.addClass('h5p-passed').html(params.UI.correctText);
    }
    else if (score === 0) {
      $feedbackElement.addClass('h5p-failed').html(params.UI.wrongText);
    }
    else {
      $feedbackElement.addClass('h5p-almost').html(params.UI.almostText);
    }
  };

  var hideSolutions = function () {
    $solutionButton.text(params.UI.showSolutionButton).removeClass('h5p-try-again');
    solutionsVisible = false;

    $feedbackElement.removeClass('h5p-passed h5p-failed h5p-almost').empty();
    $myDom.find('.h5p-correct').removeClass('h5p-correct');
    $myDom.find('.h5p-wrong').removeClass('h5p-wrong');
    //$myDom.find('.h5p-answer').removeClass('h5p-selected');
    //$myDom.find('.h5p-radio-or-checkbox').html(getCheckboxOrRadioImgPath(params.singleAnswer,false));
    $myDom.find('input').prop('disabled', false);
  };

  var maxScore = function () {
    if (!params.singleAnswer && !params.singlePoint) {
      var s = 0;
      for (var i = params.answers.length - 1; i >= 0; i--) {
        var a = params.answers[i];
        s += (a.weight !== undefined) ? a.weight : 1;
      }
      return s;
    }
    return params.weight;
  };
  
  var addSolutionButton = function () {
    $solutionButton = $myDom.children('.h5p-show-solution').show().click(function () {
      if ($solutionButton.hasClass('h5p-try-again')) {
        hideSolutions();
      }
      else {
        showSolutions();
        if (params.postUserStatistics === true) {
          H5P.setFinished(contentId, score, maxScore());
        }
      }
      return false;
    });
  };

  var calcScore = function () {
    score = 0;
    params.userAnswers = new Array();
    $('input', $myDom).each(function (idx, el) {
      var $el = $(el);
      if (($el.is(':checked') && params.answers[idx].correct) || (!$el.is(':checked') && !params.answers[idx].correct)) {
        score += 1;
      }
      if ($el.is(':checked')) {
        var num = parseInt($(el).val().split('_')[1], 10);
        params.userAnswers.push(num);
      }
    });
    if (params.singlePoint) {
      score = (score === params.answers.length) ? 1 : 0;
    }
  };

  // Function for attaching the multichoice to a DOM element.
  var attach = function (target) {
    if (typeof(target) === "string") {
      target = $("#" + target);
    } else {
      target = $(target);
    }

    // Render own DOM into target.
    $myDom = target;
    $myDom.html(template.render(params)).addClass('h5p-multichoice');
    
    $feedbackElement = $myDom.find('.h5p-show-solution-container .feedback-text');

    // Set event listeners.
    $('input', $myDom).change(function () {
      var $this = $(this);
      answerGiven = true;
      var num = parseInt($(this).val().split('_')[1], 10);
      if (params.singleAnswer) {
        params.userAnswers[0] = num;
        if (params.answers[num].correct) {
          score = 1;
        } else {
          score = 0;
        }
        $this.parents('.h5p-answers').find('.h5p-answer.h5p-selected').removeClass("h5p-selected");
        $this.parents('.h5p-answers').find('.h5p-radio-or-checkbox').html(getCheckboxOrRadioImgPath(true, false));

        $this.parents('.h5p-answer').addClass("h5p-selected");
        $this.siblings('.h5p-radio-or-checkbox').html(getCheckboxOrRadioImgPath(true, true));
      } else {  
        if ($this.is(':checked')) {
          $this.parents('.h5p-answer').addClass("h5p-selected");
          $this.siblings('.h5p-radio-or-checkbox').html(getCheckboxOrRadioImgPath(false, true));
        } else {
          $this.parents('.h5p-answer').removeClass("h5p-selected");
          $this.siblings('.h5p-radio-or-checkbox').html(getCheckboxOrRadioImgPath(false, false));
        }
        calcScore();
      }
      // Triggers must be done on the returnObject.
      $(returnObject).trigger('h5pQuestionAnswered');
    });

    if (params.displaySolutionsButton === true) {
      addSolutionButton();
    }
    else {
      $myDom.find('.h5p-show-solution').hide();
    }
    if (!params.singleAnswer) {
      calcScore();
    }

    return this;
  };

  // Initialization code
  // Randomize order, if requested
  if (params.randomAnswers) {
    params.answers = H5P.shuffleArray(params.answers);
  }
  // Start with an empty set of user answers.
  params.userAnswers = [];

  // Masquerade the main object to hide inner properties and functions.
  var returnObject = {
    machineName: 'H5P.MultiChoice',
    attach: attach, // Attach to DOM object
    getScore: function() {
      return score;
    },
    getAnswerGiven: function() {
      return answerGiven;
    },
    getMaxScore: maxScore,
    showSolutions: showSolutions,
    addSolutionButton: addSolutionButton,
    tryAgain: params.tryAgain,
    defaults: defaults // Provide defaults for inspection
  };
  // Store options.
  return returnObject;
};