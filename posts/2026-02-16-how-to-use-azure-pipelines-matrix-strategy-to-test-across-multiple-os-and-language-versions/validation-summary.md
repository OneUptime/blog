# Validation Summary: How to Use Azure Pipelines Matrix Strategy to Test Across Multiple OS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Pipelines YAML
- Azure Pipelines matrix strategy and `maxParallel`
- Microsoft-hosted agent images
- Node.js and `NodeTool@0`
- .NET and `UseDotNet@2`
- Python and `UsePythonVersion@0`
- Azure Pipelines test result and pipeline artifact tasks
- Azure Pipelines template expressions and conditions

## Sources Consulted
- Microsoft Learn: jobs.job.strategy definition, https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/jobs-job-strategy?view=azure-pipelines
- Microsoft Learn: Jobs in Azure Pipelines, https://learn.microsoft.com/en-us/azure/devops/pipelines/process/phases?view=azure-devops
- Microsoft Learn: Pipeline conditions, https://learn.microsoft.com/en-us/azure/devops/pipelines/process/conditions?view=azure-devops
- Microsoft Learn: Expressions, https://learn.microsoft.com/en-us/azure/devops/pipelines/process/expressions?view=azure-devops-2022
- Microsoft Learn: NodeTool@0 task, https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/node-tool-v0?view=azure-pipelines
- Microsoft Learn: UseDotNet@2 task, https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/use-dotnet-v2?view=azure-pipelines
- Microsoft Learn: UsePythonVersion@0 task, https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/use-python-version-v0?view=azure-pipelines
- Microsoft Learn: PublishTestResults@2 task, https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/publish-test-results-v2?view=azure-pipelines
- Microsoft Learn: PublishPipelineArtifact@1 task, https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/publish-pipeline-artifact-v1?view=azure-pipelines
- Microsoft Learn: DownloadPipelineArtifact@2 task, https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/download-pipeline-artifact-v2?view=azure-pipelines
- Node.js Releases, https://nodejs.org/en/about/previous-releases
- Node.js End-of-Life, https://nodejs.org/en/about/eol
- .NET support policy, https://dotnet.microsoft.com/en-us/platform/support/policy
- Python Developer's Guide: Status of Python versions, https://devguide.python.org/versions/

## Issues Found
- The post described matrix strategy as generating jobs from possible values, which could imply a Cartesian product. Azure Pipelines matrix entries are explicit named variable sets, so the explanation was corrected to say Azure creates one job per matrix entry.
- The Node.js examples used Node.js 18 and 20. Both are end-of-life as of the review date, so the examples were updated to use supported LTS lines Node.js 22 and 24.
- The .NET example used .NET 6, which is out of support, and used an invalid YAML/task expression for `UseDotNet@2`'s `version` input. The matrix now uses .NET 8 and .NET 10 and defines a separate `sdkVersion` matrix variable passed as `version: '$(sdkVersion)'`.
- The Python example included Python 3.9, which is end-of-life. The matrix now uses supported Python 3.10 through 3.13 examples.
- The "Dynamic Matrix with Runtime Expressions" section used compile-time template iteration rather than an Azure Pipelines runtime matrix. The heading and description were corrected to describe template-generated jobs.
- The "Viewing Matrix Results" section incorrectly tied other matrix legs continuing to `continueOnError: false`, which is the default and does not describe fail-fast behavior. The text now states that a failed leg fails the matrix job after the matrix completes while already running legs continue.
- The best-practice note about putting the most common platform first implied matrix execution order controls failure timing. It was changed to recommend a separate smoke-test job before the matrix.

## Review Notes
The remaining examples are illustrative and assume the referenced project files support the configured runtime versions and target frameworks. For production pipelines, teams should keep runtime versions aligned with their own support policy and hosted-agent image availability.
