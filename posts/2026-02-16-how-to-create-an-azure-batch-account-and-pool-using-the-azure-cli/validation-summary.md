# Validation Summary: How to Create an Azure Batch Account and Pool Using the Azure CLI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Batch
- Azure CLI
- Azure Storage
- Azure Batch pools, compute nodes, start tasks, and pool JSON configuration
- Azure virtual machine images and VM sizes

## Sources Consulted
- Azure CLI reference for `az batch account create` and `az batch account login`: https://learn.microsoft.com/en-us/cli/azure/batch/account?view=azure-cli-latest
- Azure CLI reference for `az batch pool create`, `show`, `resize`, `delete`, and supported images: https://learn.microsoft.com/en-us/cli/azure/batch/pool?view=azure-cli-latest
- Azure CLI reference for `az batch node file list`: https://learn.microsoft.com/en-us/cli/azure/batch/node/file?view=azure-cli-latest
- Azure Batch quickstart with Azure CLI: https://learn.microsoft.com/en-us/azure/batch/quick-create-cli
- Azure Batch nodes and pools documentation: https://learn.microsoft.com/en-us/azure/batch/nodes-and-pools
- Azure Batch Pool Create REST API reference: https://learn.microsoft.com/en-us/rest/api/batchservice/pools/create-pool?view=rest-batchservice-2025-06-01
- Azure Batch node states REST API reference: https://learn.microsoft.com/en-us/rest/api/batchservice/nodes/list-nodes?view=rest-batchservice-2025-06-01
- Azure Batch user account and elevation documentation: https://learn.microsoft.com/en-us/azure/batch/batch-user-accounts

## Issues Found
- The start task CLI example used `--start-task-resource-files` with only a URL. Azure CLI expects start task resource files in `filename=httpurl` format, so the example now uses `setup.sh=https://.../setup.sh?<sas-token>`.
- The start task CLI example installed system packages with `apt-get` without setting elevated task identity. Batch tasks run as non-admin by default, so the CLI example now runs a downloaded setup script, and the system-package installation example was moved into the JSON configuration that sets `userIdentity.autoUser.elevationLevel` to `admin`.
- The text said Batch would provision a replacement when a start task fails. Official documentation says the node is not usable for task scheduling after the start task fails after retries; the post now states that behavior without claiming automatic replacement.
- The monitoring section labeled an `allocationState` query as waiting until all nodes are idle. That query checks pool allocation state, not per-node idle state, so the comment was corrected.
- The troubleshooting command for start task logs did not include recursive file listing. The command now includes `--recursive` so `startup/stdout.txt` and `startup/stderr.txt` can be found reliably.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI and REST documentation rather than local `az --help` output. The Ubuntu 22.04 Batch node agent/image pairing is current and documented as supported. Storage account names in the examples are placeholders and must still be globally unique in a real subscription.
