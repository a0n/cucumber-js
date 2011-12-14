var JSONFormatter = function(options) {
  var Cucumber = require('../../cucumber');
  
  var currentFeature = null;
  var currentScenario = null;
  var currentBackground = null;
  var currentStep = null;
  
  var CurrentTestStartTime = null;
  var CurrentFeatureStartTime = null;
  var CurrentScenarioStartTime = null;
  var CurrentStepStartTime = null;
  var fs = require('fs');
  
  var features = []
  var test_response = {}
  test_response["undefined_steps_count"] = 0;
  test_response["passed_steps_count"] = 0;
  test_response["failed_steps_count"] = 0;
  test_response["pending_steps_count"] = 0;
  test_response["skipped_steps_count"] = 0;
  test_response["passed_features_count"] = 0;
  test_response["pending_features_count"] = 0;
  test_response["failed_features_count"] = 0;
  test_response["undefined_features_count"] = 0;
  test_response["passed_scenarios_count"] = 0;
  
  var self = {
    hear: function hear(event, callback) {

      if (self.hasHandlerForEvent(event)) {
        var handler = self.getHandlerForEvent(event);
        handler(event, callback);
      } else {
        callback();
      }
    },

    hasHandlerForEvent: function hasHandlerForEvent(event) {
      var handlerName = self.buildHandlerNameForEvent(event);
      return self[handlerName] != undefined;
    },

    buildHandlerNameForEvent: function buildHandlerNameForEvent(event) {
      var handlerName =
        JSONFormatter.EVENT_HANDLER_NAME_PREFIX +
        event.getName() +
        JSONFormatter.EVENT_HANDLER_NAME_SUFFIX;
      return handlerName;
    },

    getHandlerForEvent: function getHandlerForEvent(event) {
      var eventHandlerName = self.buildHandlerNameForEvent(event);
      return self[eventHandlerName];
    },

    handleBeforeFeatureEvent: function handleBeforeFeatureEvent(event, callback) {
        feature = {};
        feature["keyword"] = event.getPayloadItem("feature").getKeyword();
        feature["tags"] = event.getPayloadItem("feature").getTags();
        feature["name"] = event.getPayloadItem("feature").getName();
        feature["description"] = event.getPayloadItem("feature").getDescription();
        feature["line"] = event.getPayloadItem("feature").getLine();
        feature["hasBackground"] = event.getPayloadItem("feature").hasBackground();
        feature["scenarios"] = [];
        feature["background"] = null;
        feature["undefined_steps_count"] = 0;
        feature["passed_steps_count"] = 0;
        feature["failed_steps_count"] = 0;
        feature["pending_steps_count"] = 0;
        feature["skipped_steps_count"] = 0;
        currentFeature = feature;
        
        //generate current feature
        //save json
        CurrentFeatureStartTime = Date.now();
        callback();
      },

      handleAfterFeatureEvent: function handleAfterFeatureEvent(event, callback) {
        currentFeature["duration"] = Date.now() - CurrentFeatureStartTime
        if (!currentFeature["result"]) {
          currentFeature["result"] = {"status" : "passed", "label": "success"};
          self.witnessedPassedFeature();
        } else if (currentFeature["result"]["status"] == "pending") {
          self.witnessedPendingFeature();
        } else if (currentFeature["result"]["status"] == "failed") {
          self.witnessedFailedFeature();
        } else if (currentFeature["result"]["status"] == "undefined") {
          self.witnessedUndefinedFeature();
        }

        currentFeature["background"] = currentBackground
        if (currentBackground.steps.length > 1) {
          console.log("YEAH MORE THAN ONE STEP IN BACKGROUDN!")
        }
        currentBackground = null

        features.push(currentFeature)
        currentFeature = null;
        //push feature to json
        //save json
        callback();
      },

      handleBeforeFeaturesEvent: function handleAfterFeaturesEvent(event, callback) {
          CurrentTestStartTime = Date.now();
          callback();
      },

      handleAfterFeaturesEvent: function handleAfterFeaturesEvent(event, callback) {
        var created_at = new Date(CurrentTestStartTime);
        
       // test_response["created_at"] = created_at.getYear() + "/" + created_at.getDate() +":"+ created_at.getMonth() +":"+ created_at.getYear()
        test_response["duration"] = Date.now() - CurrentTestStartTime;
        test_response["features"] = features
        var response = JSON.stringify(test_response);
        fs.mkdir('cucumber_json_results', 0777, function (err) {
            
                fs.writeFile("./cucumber_json_results/" + Date.now() + ".json", response, function(err) {
                    if(err) {
                        console.log(err);
                    } else {
                        console.log("The file was saved!");
                    }
                });
            
        });
        //save json
        callback();
      },

      handleBeforeScenarioEvent: function handleBeforeScenarioEvent(event, callback) {
        scenario = {};
        //scenario["current_feature"] = currentFeature;
        scenario["keyword"] = event.getPayloadItem("scenario").getKeyword();
        scenario["name"] = event.getPayloadItem("scenario").getName();
        scenario["line"] = event.getPayloadItem("scenario").getLine();
        scenario["tags"] = event.getPayloadItem("scenario").getTags();
        scenario["undefined_steps_count"] = 0;
        scenario["pending_steps_count"] = 0;
        scenario["passed_steps_count"] = 0;
        scenario["failed_steps_count"] = 0;
        scenario["skipped_steps_count"] = 0;
        scenario["steps"] = [];
        scenario["background"] = [];
        CurrentScenarioStartTime = Date.now();
        currentScenario = scenario;
        callback();
      },

      handleAfterScenarioEvent: function handleAfterScenarioEvent(event, callback) {
        if (!currentScenario["result"]) {
          currentScenario["result"] = {"status" : "passed", "label": "success"};
          self.witnessedPassedScenario();
        } else {
          if (!currentFeature["result"] || (currentFeature["result"] && currentFeature["result"]["status"] != "failed")){
            currentFeature["result"] = currentScenario["result"];
          }
        }
        
        currentScenario["duration"] = Date.now() - CurrentScenarioStartTime;
        currentFeature["scenarios"].push(currentScenario);
        currentScenario = null
        callback();
      },

      handleBeforeStepEvent: function handleBeforeScenarioEvent(event, callback) {
        step = {};
        step["keyword"] = event.getPayloadItem("step").getKeyword()
        step["name"] = event.getPayloadItem("step").getName();
        step["line"] = event.getPayloadItem("step").getLine();
        
        CurrentStepStartTime = Date.now()
        currentStep = step;
        callback();
      },

      handleUndefinedStepEvent: function handleUndefinedStepEvent(event, callback) {
        step = {};
        step["keyword"] = event.getPayloadItem("step").getKeyword()
        step["name"] = event.getPayloadItem("step").getName();
        step["line"] = event.getPayloadItem("step").getLine();
        step["result"] = {"status": "undefined", "label": "warning"};
        
        self.addStepToScenarioOrBackground(step);

        self.mark_current_scenario_as_undefined();
        self.witnessedUndefinedStep()
        callback();
      },

      handleSkippedStepEvent: function(event, callback) {
        step = {};
        step["keyword"] = event.getPayloadItem("step").getKeyword()
        step["name"] = event.getPayloadItem("step").getName();
        step["line"] = event.getPayloadItem("step").getLine();
        step["result"] = {"status": "skipped"};

        self.addStepToScenarioOrBackground(step);

        self.witnessedSkippedStep()
        callback();
      },


      handleStepResultEvent: function handleStepResultEvent(event, callback) {
        stepResult = event.getPayloadItem("stepResult")

        if (stepResult.isSuccessful()) {
          currentStep["result"] = {"status" : "passed", "label": "success"};
          self.witnessedPassedStep();
        } else if (stepResult.isPending()) {
          currentStep["result"] = {"status": "pending", "label": "notice"};
          self.witnessedPendingStep();
          self.mark_current_scenario_as_pending();
        }  else if (stepResult.isFailed()) {
          currentStep["exception"] = stepResult.getFailureException();
          currentStep["result"] = {"status": "failed", "label": "important"};
          self.witnessedFailedStep();
          self.mark_current_scenario_as_failed();
        }
        
        callback();
      },
     
      addStepToScenarioOrBackground: function addStepToScenarioOrBackground(step) {
        if (currentBackground && (currentBackground.line < step["line"] && step["line"] < currentScenario.line)) {
          var background_step_exists = false
          for (index in currentBackground["steps"]) {
            existing_step = currentBackground["steps"][index];
            if (existing_step.line == step.line) {
              background_step_exists = true;
              //currentFeature["background"]["steps"][i] = step
            }
          }
          if (background_step_exists == false) {
            currentBackground["steps"].push(step);
          }
        } else {
          currentScenario["steps"].push(step);          
        }
      },

      handleAfterStepEvent: function handleAfterStepEvent(event, callback) {
        currentStep["duration"] = Date.now() - CurrentStepStartTime;
        self.addStepToScenarioOrBackground(currentStep);
        currentStep = null;
        callback();
      },
      
      handleBackgroundEvent: function handleBackgroundEvent(event, callback) {
        background = {};
        background["keyword"] = event.getPayloadItem("background").getKeyword();
        background["name"] = event.getPayloadItem("background").getName();
        background["description"] = event.getPayloadItem("background").getDescription();
        background["line"] = event.getPayloadItem("background").getLine();
        background["steps"] = [];
        currentBackground = background;
         
        callback();
      },
      
      mark_current_scenario_as_undefined: function mark_current_scenario_as_undefined() {
        if (!currentScenario["result"]){
          currentScenario["result"] = {"status" : "undefined", "label": "warning"};
        }
      },
      
      mark_current_scenario_as_failed: function mark_current_scenario_as_failed() {
        if (!currentScenario["result"]){
          currentScenario["result"] = {"status" : "failed", "label": "important"};
        }
      },
      
      mark_current_scenario_as_pending: function mark_current_scenario_as_pending() {
        if (!currentScenario["result"]){
          currentScenario["result"] = {"status" : "pending", "label": "notice"};
        }
      },
      
      witnessedUndefinedStep: function witnessedUndefinedStep() {
        currentScenario["undefined_steps_count"]++;
        currentFeature["undefined_steps_count"]++;
        test_response["undefined_steps_count"]++;
      },
      
      witnessedSkippedStep: function witnessedSkippedStep() {
        currentScenario["skipped_steps_count"]++;
        currentFeature["skipped_steps_count"]++;
        test_response["skipped_steps_count"]++;
      },
      
      witnessedFailedStep: function witnessedFailedStep() {
        currentScenario["failed_steps_count"]++;
        currentFeature["failed_steps_count"]++;
        test_response["failed_steps_count"]++;
      },
      
      witnessedPendingStep: function witnessedPendingStep() {
        currentScenario["pending_steps_count"]++;
        currentFeature["pending_steps_count"]++;
        test_response["pending_steps_count"]++;
      },
      
      witnessedPassedStep: function witnessedPassedStep() {
        currentScenario["passed_steps_count"]++;
        currentFeature["passed_steps_count"]++;
        test_response["passed_steps_count"]++;
      },

      witnessedPassedFeature: function witnessedPassedFeature() {
        test_response["passed_features_count"]++;
      },

      witnessedPendingFeature: function witnessedPendingFeature() {
        test_response["pending_features_count"]++;
      },

      witnessedFailedFeature: function witnessedFailedFeature() {
        test_response["failed_features_count"]++;
      },

      witnessedUndefinedFeature: function witnessedUndefinedFeature() {
        test_response["undefined_features_count"]++;
      },

      witnessedPassedScenario: function witnessedPassedScenario() {
        test_response["passed_scenarios_count"]++;
      }
      
  };
  return self;
};
JSONFormatter.EVENT_HANDLER_NAME_PREFIX = 'handle';
JSONFormatter.EVENT_HANDLER_NAME_SUFFIX = 'Event';
module.exports                              = JSONFormatter;
