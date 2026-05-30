# Validation Summary: How to Set Up Parallel Jobs in Azure Pipelines to Speed Up Build

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Pipelines YAML
- Azure DevOps parallel jobs
- Microsoft-hosted and self-hosted agents
- Azure Pipelines matrix and parallel job strategies
- Visual Studio Test task
- .NET CLI testing
- Node.js and npm in CI
- Azure Pipelines caching and pipeline artifacts

## Sources Consulted
- Azure Pipelines jobs documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/phases?view=azure-devops
- Azure Pipelines stage schema: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/stages-stage?view=azure-pipelines
- Azure Pipelines job strategy schema: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/jobs-job-strategy?view=azure-pipelines
- Azure DevOps parallel jobs licensing: https://learn.microsoft.com/en-us/azure/devops/pipelines/licensing/concurrent-jobs?view=azure-devops
- Azure Pipelines run and parallel job behavior: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/runs?view=azure-devops
- Visual Studio Test task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/vstest-v3?view=azure-pipelines
- .NET Core CLI task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/dotnet-core-cli-v2?view=azure-pipelines
- Pipeline artifacts documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/artifacts/pipeline-artifacts?view=azure-devops
- Pipeline caching documentation: https://learn.microsoft.com/en-us/azure/devops/pipelines/release/caching?view=azure-devops
- Node.js tool installer task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/node-tool-v0?view=azure-pipelines

## Issues Found
- The post said stages without dependencies run in parallel by default. Azure Pipelines stages run sequentially by default unless `dependsOn` changes the dependency graph, so the text and code comment were corrected.
- The post described "parallel steps within a job" as a pipeline feature. Azure Pipelines steps run sequentially; concurrent work within a job must be handled by a script or tool, so the wording was corrected.
- The automatic test-slicing example used `DotNetCoreCLI@2`, which does not automatically distribute tests across multiple agents. The example was changed to `VSTest@3`, which supports multi-agent test distribution and historical execution-time batching.
- The parallel job limits section oversimplified Microsoft-hosted and self-hosted capacity, and incorrectly described extra self-hosted agents as automatically adding parallel-job capacity. The section was updated to match current Azure DevOps licensing behavior.
- The npm cache example referenced `$(npm_config_cache)` without defining it. The snippet now defines `npm_config_cache` under `$(Pipeline.Workspace)`, matching Microsoft guidance.
- The fan-in example published a relative `TestResults` folder and searched for downloaded test results in the default source directory. The commands now write TRX files to `$(Agent.TempDirectory)/TestResults`, publish that directory, and configure `PublishTestResults@2` to search `$(Pipeline.Workspace)` after artifact download.

## Review Notes
- `NodeTool@0` is still documented and functional, but Microsoft notes that `UseNode@1` is the newer task.
