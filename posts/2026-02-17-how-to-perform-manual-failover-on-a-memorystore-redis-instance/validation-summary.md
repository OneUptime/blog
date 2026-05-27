# Validation Summary: How to Perform Manual Failover on a Memorystore Redis Instance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Memorystore for Redis
- Google Cloud CLI
- Redis replication and INFO command
- Cloud Monitoring
- Kubernetes kubectl
- Cloud Run logging
- Bash scripting

## Sources Consulted
- Google Cloud Memorystore for Redis manual failover overview: https://cloud.google.com/memorystore/docs/redis/about-manual-failover
- Google Cloud Memorystore for Redis initiate manual failover guide: https://cloud.google.com/memorystore/docs/redis/initiate-manual-failover
- Google Cloud SDK reference for `gcloud redis instances failover`: https://cloud.google.com/sdk/gcloud/reference/redis/instances/failover
- Google Cloud Memorystore for Redis supported monitoring metrics: https://cloud.google.com/memorystore/docs/redis/supported-monitoring-metrics
- Google Cloud Memorystore for Redis REST instance reference: https://cloud.google.com/memorystore/docs/redis/reference/rest/v1/projects.locations.instances
- Google Cloud Memorystore for Redis FAQ: https://cloud.google.com/memorystore/docs/redis/faq
- Redis `INFO` command documentation: https://redis.io/docs/latest/commands/info/

## Issues Found
- The post said `limited-data-loss` waits for the replica to fully catch up and that data will not be lost. Updated this to match Google Cloud documentation: the mode checks that the primary/replica offset delta is below 30 MB and aborts if the delta is 30 MB or greater.
- The post described a write pause while replication catches up. Reworded this as a data protection check because the official documentation describes an offset-delta check rather than an explicit wait-for-full-sync write pause.
- The pre-check advised looking for `slave_repl_offset` while connecting to the primary endpoint. Updated this to check `master_repl_offset` and the replica offset in the `slave0` line, and added the official Cloud Monitoring `redis.googleapis.com/replication/offset_diff` metric.
- The expected tier value in API-style output was listed as `STANDARD`. Updated it to `STANDARD_HA`, which is the REST API enum value for the Standard high-availability tier.
- The post said failover typically takes 30-60 seconds. Updated this to around 30 seconds based on the Google Cloud Memorystore FAQ.
- The post used absolute wording that `force-data-loss` will lose unreplicated writes. Changed this to "can be lost" because loss depends on whether writes were pending replication.

## Review Notes
The `gcloud redis instances failover` commands and `--data-protection-mode` values match the current Google Cloud CLI reference. Local `gcloud` and `redis-cli` binaries were not available in this workspace, so CLI verification was performed against official documentation rather than local `--help` output.
