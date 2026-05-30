# Validation Summary: How to Use Low-Priority Nodes in Azure Batch Pools to Reduce Costs

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Batch
- Azure Batch Spot nodes
- Azure CLI
- Azure Batch autoscale formulas
- Azure Storage Blob SDK for Python
- JSON task configuration
- Mermaid diagrams

## Sources Consulted
- Microsoft Learn: Use Spot VMs with Batch workloads - https://learn.microsoft.com/en-us/azure/batch/batch-spot-vms
- Microsoft Learn: Migrate Batch low-priority VMs to Spot VMs - https://learn.microsoft.com/en-us/azure/batch/low-priority-vms-retirement-migration-guide
- Microsoft Learn: Azure CLI `az batch pool` reference - https://learn.microsoft.com/en-us/cli/azure/batch/pool
- Microsoft Learn: Azure CLI `az batch node` reference - https://learn.microsoft.com/en-us/cli/azure/batch/node
- Microsoft Learn: Azure Batch nodes REST API reference - https://learn.microsoft.com/en-us/rest/api/batchservice/nodes/list-nodes

## Issues Found
- The post treated Azure Batch low-priority nodes and Spot nodes as equivalent current features. Azure Batch low-priority compute nodes were retired on September 30, 2025, while Spot nodes remain supported. Updated the body to use Spot nodes as the current feature and added a note that some CLI/API names still use "low-priority" terminology for Spot node target counts.
- The post used fixed sample low-priority pricing and an "up to 80%" savings claim. Spot prices vary by VM size, region, and available Azure capacity, so the fixed table could become inaccurate. Replaced exact sample prices with guidance to check current Azure pricing.
- The preemption flow said a preempted node is removed from the pool. Microsoft documentation says list operations still return preempted nodes, local VM data is lost, and Batch keeps trying to reach the target Spot node count. Updated the preemption steps accordingly.
- The retry section said `maxTaskRetryCount` should account for preemptions and that preempted tasks fail without retries. Microsoft documentation says interrupted tasks are automatically requeued after Spot preemption, and recovery retries are independent of task retry counts. Updated the retry section and common pitfall to distinguish preemption requeue from application failure retries.
- The pool creation section did not mention that Spot nodes require user subscription pool allocation mode. Added this caveat while preserving the existing Azure CLI examples.

## Review Notes
The local environment did not have the Azure CLI installed, so command validation was performed against official Azure CLI documentation rather than local `az --help` output. The Python checkpointing snippet is illustrative and syntactically valid, but it assumes the surrounding task code provides `heavy_computation`, `data_items`, and a valid `STORAGE_CONN` environment variable.
