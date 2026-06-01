# Validation Summary: How to Configure Auto-Scaling for Azure Databricks Clusters to Reduce Costs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Databricks
- Databricks compute autoscaling
- Databricks CLI
- Databricks SDK for Python
- Databricks cluster pools
- Azure Spot VMs
- Apache Spark configuration

## Sources Consulted
- Azure Databricks compute configuration reference: https://learn.microsoft.com/en-us/azure/databricks/clusters/create-cluster
- Azure Databricks cost optimization best practices: https://learn.microsoft.com/en-us/azure/databricks/lakehouse-architecture/cost-optimization/best-practices
- Azure Databricks compute policy reference: https://learn.microsoft.com/en-us/azure/databricks/admin/clusters/policy-definition
- Databricks CLI clusters command reference: https://docs.databricks.com/aws/en/dev-tools/cli/reference/clusters-commands
- Databricks CLI instance-pools command reference: https://docs.databricks.com/aws/en/dev-tools/cli/reference/instance-pools-commands
- Databricks pool configuration reference: https://docs.databricks.com/aws/en/compute/pools
- Databricks Clusters API events reference: https://docs.databricks.com/api/workspace/clusters/events
- Databricks SDK for Python jobs documentation: https://databricks-sdk-py.readthedocs.io/en/latest/workspace/jobs/jobs.html
- Databricks SDK for Python compute dataclasses: https://databricks-sdk-py.readthedocs.io/en/latest/dbdataclasses/compute.html
- Databricks SDK for Python jobs dataclasses: https://databricks-sdk-py.readthedocs.io/en/latest/dbdataclasses/jobs.html

## Issues Found
- The autoscaling explanation was too specific about pending Spark tasks and idle workers. Updated it to describe load, Spark task demand, and workspace autoscaling mode, matching Azure Databricks documentation for optimized and standard autoscaling behavior.
- The all-purpose cluster JSON included `spark.databricks.cluster.profile: serverless`, which is not appropriate for a classic all-purpose cluster configuration. Removed that Spark configuration entry.
- The Databricks CLI cluster creation command omitted the required `SPARK_VERSION` positional argument used by the current CLI command reference. Updated the command to `databricks clusters create 13.3.x-scala2.12 --json ...`.
- The Databricks SDK job example imported unused `JobSettings` and imported compute cluster classes from the jobs module. Updated the imports to use `AutoScale` and `ClusterSpec` from `databricks.sdk.service.compute`.
- The instance pool CLI example omitted the required `INSTANCE_POOL_NAME` and `NODE_TYPE_ID` positional arguments. Updated it to `databricks instance-pools create analytics-pool Standard_DS3_v2 --json ...`.
- The cluster-pool latency claim was overly absolute. Updated it to say pools can make scale-up much faster and that preloaded Databricks Runtime versions can further reduce startup time.
- The monitoring example used non-existent cluster event types `NODES_ADDED` and `NODES_REMOVED`, and treated SDK event details like a dictionary. Updated the example to use current event types such as `AUTOSCALING_STATS_REPORT`, `UPSIZE_COMPLETED`, and `RESIZING`, and to read SDK event detail attributes.
- The advice to increase a generic scale-down threshold was imprecise. Updated it to mention concrete tuning options, including `spark.databricks.aggressiveWindowDownS` for optimized autoscaling.

## Review Notes
The Databricks CLI was not installed locally, so CLI verification was performed against the current official Databricks CLI documentation. Python examples were syntax-checked locally, but the Databricks SDK package is not installed in this workspace, so runtime import validation could not be performed locally.
