# Validation Summary: How to Size a Cloud Bigtable Cluster for Your Production Workload

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Google Cloud Bigtable
- Google Cloud CLI
- Bigtable autoscaling
- Cloud Monitoring metrics
- Python sizing helper script

## Sources Consulted
- Google Cloud Bigtable performance documentation: https://docs.cloud.google.com/bigtable/docs/performance
- Google Cloud Bigtable autoscaling documentation: https://cloud.google.com/bigtable/docs/autoscaling
- Google Cloud Bigtable instance creation documentation: https://docs.cloud.google.com/bigtable/docs/creating-instance
- Google Cloud Bigtable instances, clusters, and nodes documentation: https://docs.cloud.google.com/bigtable/docs/instances-clusters-nodes
- Google Cloud Bigtable scaling documentation: https://cloud.google.com/bigtable/docs/scaling
- Google Cloud SDK reference for `gcloud bigtable instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/bigtable/instances/create
- Google Cloud SDK reference for `gcloud bigtable clusters update`: https://cloud.google.com/sdk/gcloud/reference/bigtable/clusters/update
- Google Cloud SDK reference for `gcloud bigtable clusters list`: https://cloud.google.com/sdk/gcloud/reference/bigtable/clusters/list
- Google Cloud Bigtable metrics documentation: https://docs.cloud.google.com/bigtable/docs/metrics
- Google Cloud Bigtable hot tablets documentation: https://docs.cloud.google.com/bigtable/docs/hot-tablets
- Google Cloud Bigtable pricing documentation: https://cloud.google.com/bigtable/pricing
- Google Cloud Bigtable routing documentation: https://cloud.google.com/bigtable/docs/routing

## Issues Found
- The SSD per-node throughput figures were outdated. Google currently documents up to 17,000 reads per second or 14,000 writes per second per node for typical 1 KB rows, so the post and Python helper were updated from 10,000 reads/writes per second.
- The CPU utilization guidance used a 70% threshold for latency-sensitive workloads. Current Bigtable performance guidance uses 60% for latency optimization and 90% for throughput optimization, so the utilization diagram and explanation were updated.
- The SSD storage guidance said to choose SSD when data size is under 10 TB per node, but the documented SSD node storage capacity is 5 TB per node. The wording was changed to refer generally to SSD storage limits.
- The cost section said HDD nodes are roughly one-third the cost of SSD nodes. Bigtable pricing distinguishes provisioned node costs from storage costs; the relevant savings are from cheaper HDD storage per GiB. The wording was corrected.
- The instance creation command placed `storage-type=SSD` inside `--cluster-config`, which is not a documented key for that flag. The command was changed to use `--cluster-storage-type=SSD` with `--cluster-config` containing the cluster ID, zone, and node count.
- The monitoring section used a fixed 70% CPU threshold. It now refers to the workload's latency or throughput target so it matches current Bigtable guidance.
- The production minimum-node guidance implied that Bigtable requires or recommends three nodes for production to handle node failures. Current documentation states that clusters have at least one node and explains that node failure recovery is fast because data is stored separately from nodes. The wording was changed to emphasize sizing for workload, storage, and failover requirements.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so command verification was performed against official Google Cloud SDK reference documentation rather than local `gcloud --help` output.
