# Validation Summary: Use Spot Workers Safely in Databricks Jobs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Databricks classic compute and compute policies
- Lakeflow Jobs and the Jobs API
- Apache Spark executor recovery and autoscaling
- Delta Lake and Databricks SQL `MERGE`
- AWS EC2 Spot Instances
- Azure Spot Virtual Machines
- Google Cloud Spot and preemptible VMs
- Structured Streaming checkpoints

## Sources Consulted
- [Databricks compute configuration reference on AWS](https://docs.databricks.com/aws/en/compute/configure)
- [Databricks compute policy reference on AWS](https://docs.databricks.com/aws/en/admin/clusters/policy-definition)
- [Azure Databricks compute policy reference](https://learn.microsoft.com/en-us/azure/databricks/admin/clusters/policy-definition)
- [Databricks compute policy reference on Google Cloud](https://docs.databricks.com/gcp/en/admin/clusters/policy-definition)
- [Databricks Clusters API reference on Google Cloud](https://docs.databricks.com/api/gcp/workspace/clusters/get)
- [Databricks pool best practices](https://docs.databricks.com/aws/en/compute/pool-best-practices)
- [Databricks Jobs API 2.1 update guide](https://docs.databricks.com/gcp/en/reference/jobs-api-2-1-updates)
- [Configure and edit tasks in Lakeflow Jobs](https://docs.databricks.com/aws/en/jobs/configure-task)
- [Databricks SQL `MERGE INTO` reference](https://docs.databricks.com/aws/en/sql/language-manual/delta-merge-into)
- [Upsert into a Delta Lake table using `MERGE`](https://docs.databricks.com/aws/en/delta/merge)
- [Databricks Structured Streaming checkpoints](https://docs.databricks.com/aws/en/structured-streaming/checkpoints)
- [Databricks compute system tables reference](https://docs.databricks.com/aws/en/admin/system-tables/compute)
- [Databricks fleet instance types reference](https://docs.databricks.com/aws/en/compute/fleet-instance-types)
- [Apache Spark configuration reference](https://spark.apache.org/docs/latest/configuration.html)
- [Apache Spark job scheduling guide](https://spark.apache.org/docs/latest/job-scheduling.html)
- [Amazon EC2 Spot interruption notices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html)
- [Azure Spot Virtual Machines](https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms)
- [Google Cloud Spot VMs](https://cloud.google.com/compute/docs/instances/spot)

## Issues Found
- The introduction did not state that user-configured Spot attributes, pools, and compute policies apply to jobs using classic compute. It now scopes the guide to classic compute so readers do not apply these settings to serverless compute, whose capacity Databricks manages.
- The post said `first_on_demand` counted nodes only on AWS and Azure and described `PREEMPTIBLE_WITH_FALLBACK_GCP` as pool-only. The Google Cloud Clusters API also exposes `gcp_attributes.first_on_demand` and `gcp_attributes.availability`, so the text and fallback table now include Google Cloud compute as well as pools.
- The retry guidance treated `min_retry_interval_millis` like a delay beginning after failure and did not explain how timeouts interact with retries. Databricks measures the interval from the start of the failed attempt to the start of the retry, and a configured task timeout applies separately to every retry. The guidance now reflects both behaviors and directs readers to budget the total worst-case duration externally.
- The `MERGE` example used `UPDATE SET *` and `INSERT *` without stating their schema requirement. The explanation now notes that the source must provide corresponding columns for every target column, in addition to having one deterministic row per target key.

## Review Notes
- The post does not target a specific Databricks Runtime version. The wildcard `MERGE` syntax used is current; duplicate-match evaluation differs in Databricks Runtime 16.0 and above, but the post's one-source-row-per-key requirement avoids that version-specific ambiguity.
- Databricks continues to use `PREEMPTIBLE_GCP` names in its Google Cloud configuration enums even though Google Cloud documents both Spot VMs and legacy preemptible VMs.
- AWS interruption notices are best effort, and the normal two-minute warning has a hibernation exception. Databricks worker reclamation guidance should continue to treat these notices only as operational signals, as the post does.
