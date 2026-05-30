# Validation Summary: How to Write an Autoscale Formula for Azure Batch Pools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Batch
- Azure Batch autoscale formulas
- Azure CLI
- Azure Spot nodes
- Azure Batch pool management

## Sources Consulted
- Microsoft Learn: Autoscale compute nodes in an Azure Batch pool - https://learn.microsoft.com/en-us/azure/batch/batch-automatic-scaling
- Microsoft Learn: az batch pool autoscale - https://learn.microsoft.com/en-us/cli/azure/batch/pool/autoscale
- Microsoft Learn: az batch pool - https://learn.microsoft.com/en-us/cli/azure/batch/pool

## Issues Found
- The post described `$PendingTasks` as only tasks waiting to run, `$ActiveTasks` as running tasks, and `$RunningTasks` as an alias for `$ActiveTasks`. Updated the variable descriptions to match Azure Batch documentation: `$PendingTasks` is the sum of active and running tasks, `$ActiveTasks` is ready but not executing, and `$RunningTasks` is currently running.
- The pool creation command used `--auto-scale-evaluation-interval`, but the current Azure CLI reference for `az batch pool create` does not expose that option. Removed the flag from the create command and clarified that the CLI create path uses the default interval unless a JSON request body is used.
- The gradual scale-down example claimed to avoid interrupting running tasks but did not set `$NodeDeallocationOption`. Added `$NodeDeallocationOption = taskcompletion;`, which Azure Batch documents as the setting that waits for currently running tasks to finish before removing nodes.
- The introduction referred to custom metrics. Azure Batch autoscale formulas support service-defined task/resource metrics and user-defined formula variables, not arbitrary external custom metrics in the formula. Reworded this to "resource metrics" and "custom logic."

## Review Notes
The Azure CLI was not installed in the local environment, so command verification was performed against the current Microsoft Learn CLI reference rather than local `az --help` output.
