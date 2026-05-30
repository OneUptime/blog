# Validation Summary: How to Set Up Azure Pipelines Stage Dependencies and Conditions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Pipelines YAML
- Azure Pipelines stages and stage dependencies
- Azure Pipelines conditions and expressions
- Azure Pipelines output variables
- Azure Pipelines runtime parameters
- Deployment jobs and environments

## Sources Consulted
- Microsoft Learn: Pipeline conditions - Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/conditions?view=azure-devops
- Microsoft Learn: stages.stage definition: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/stages-stage?view=azure-pipelines
- Microsoft Learn: Expressions - Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/expressions?view=azure-devops
- Microsoft Learn: Set variables in scripts - Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/set-variables-scripts?view=azure-devops
- Microsoft Learn: pipeline.parameters.parameter definition: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/parameters-parameter?view=azure-pipelines

## Issues Found
- The "Complex Condition Expressions" YAML snippet referenced `Build` and `Deploy` stages in `dependsOn` without defining them in the snippet. I added minimal `Build` and `Deploy` stages and made the scheduled stage explicitly depend on `Build`, so the example is self-contained and its dependency names resolve.
- The scheduled-stage condition did not include a status check. Because custom conditions override Azure Pipelines' default succeeded behavior, I added `succeeded()` to preserve the intended "only after successful dependency" behavior.
- The parameter-driven skipping example used an object parameter with `values` and passed the object through `containsValue` as a quoted template string. Microsoft documents parameter expansion directly in conditions, and `containsValue` expects an array/object value, not a stringified template expression. I replaced the object selector with boolean runtime parameters.
- The parameter-driven deployment stages depended on optional earlier stages while also using `succeeded()`. If an optional stage was skipped, a later selected stage would also be skipped. I updated the dependencies and conditions to check dependency results explicitly, allowing `Skipped` only for optional stages while still blocking deployment when required stages fail.

## Review Notes
The remaining examples align with current Microsoft Azure Pipelines documentation for default sequential stages, `dependsOn: []`, status functions such as `succeeded()`, `failed()`, and `always()`, stage output variable syntax with `stageDependencies`, and stage-level dependency result checks. No deprecated Azure Pipelines APIs or task versions were identified in the reviewed snippets.
