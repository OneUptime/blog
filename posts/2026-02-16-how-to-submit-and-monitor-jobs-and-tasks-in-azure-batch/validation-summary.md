# Validation Summary: How to Submit and Monitor Jobs and Tasks in Azure Batch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Batch
- Azure CLI
- Azure Storage blobs
- Azure Batch jobs, tasks, task dependencies, resource files, output files, and task monitoring
- JSON request bodies for Azure Batch task creation

## Sources Consulted
- Azure CLI reference: az batch job - https://learn.microsoft.com/en-us/cli/azure/batch/job?view=azure-cli-latest
- Azure CLI reference: az batch task - https://learn.microsoft.com/en-us/cli/azure/batch/task?view=azure-cli-latest
- Azure CLI reference: az batch task file - https://learn.microsoft.com/en-us/cli/azure/batch/task/file?view=azure-cli-latest
- Azure CLI reference: az batch account - https://learn.microsoft.com/en-us/cli/azure/batch/account?view=azure-cli-latest
- Azure Batch REST API: Task - Add - https://learn.microsoft.com/en-us/rest/api/batchservice/task/add?view=rest-batchservice-2024-07-01
- Azure Batch REST API: Job - Add - https://learn.microsoft.com/en-us/rest/api/batchservice/job/add?view=rest-batchservice-2024-07-01
- Azure Batch REST API: Job - Get Task Counts - https://learn.microsoft.com/en-us/rest/api/batchservice/job/get-task-counts?view=rest-batchservice-2024-07-01
- Azure Batch documentation: Create task dependencies to run tasks - https://learn.microsoft.com/en-us/azure/batch/batch-task-dependencies
- Azure Batch documentation: Persist output data to Azure Storage with Batch service API - https://learn.microsoft.com/en-us/azure/batch/batch-task-output-files
- Azure Batch documentation: Submit a large number of tasks to a Batch job - https://learn.microsoft.com/en-us/azure/batch/large-number-tasks

## Issues Found
- The job creation example used task-level CLI flags `--max-task-retry-count` and `--max-wall-clock-time`. For `az batch job create`, the current flags are `--job-max-task-retry-count` and `--job-max-wall-clock-time`, so the command and explanatory text were updated.
- The single-task resource file example passed a JSON array to `--resource-files`. The Azure CLI expects space-separated `filename=httpurl` entries for this parameter, so the example was corrected.
- The resource file examples used private-looking blob URLs without noting access requirements. Azure Batch resource files require public URLs or SAS URLs, so the text and sample URLs were updated to include SAS placeholders.
- The output file `uploadCondition` values used camelCase. The Batch REST API enum values are lowercase (`tasksuccess`, `taskfailure`, `taskcompletion`), so the JSON examples and explanatory text were corrected.
- The task dependency example passed `true` to `--uses-task-dependencies`. The current Azure CLI documents this as a presence flag, so the example was changed to use the flag without a value.
- The cleanup example used `terminateJob` for `--on-all-tasks-complete`. The current Azure CLI known value is `terminatejob`, so the command was corrected.
- The post said a single job can contain "millions" of tasks. Official guidance describes large jobs as tens or hundreds of thousands of tasks, or more, so the statement was softened to match documented scale guidance.

## Review Notes
The Azure CLI was not installed in the local environment, so command verification was performed against current Microsoft Learn CLI and Azure Batch REST documentation. The examples still use placeholder SAS fragments (`?sv=...`) and assume the referenced tools such as `python3`, `ffmpeg`, `wget`, and `unzip` are available on the Batch pool image or installed separately.
