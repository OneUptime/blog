# Validation Summary: How to Back Up and Restore OpenTelemetry Backend Data in Kubernetes

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- OpenTelemetry backend operations
- Kubernetes pods, StatefulSets, CronJobs, PVCs, `kubectl run`, `kubectl cp`, and `kubectl exec`
- Prometheus TSDB snapshots and restore
- Grafana Loki object storage, TSDB index, and BoltDB Shipper
- Grafana Tempo object storage, WAL, flush API, and Kafka-based ingestion durability
- AWS CLI S3 copy operations
- Python, Boto3, and S3 object listing pagination

## Sources Consulted
- Prometheus HTTP API / TSDB admin snapshot API: https://prometheus.io/docs/prometheus/latest/querying/api/#snapshot
- Grafana Loki storage documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki BoltDB Shipper documentation: https://grafana.com/docs/loki/latest/operations/storage/boltdb-shipper/
- Grafana Tempo HTTP API: https://grafana.com/docs/tempo/latest/api_docs/
- Grafana Tempo architecture and object storage documentation: https://grafana.com/docs/tempo/latest/reference-tempo-architecture/about-tempo-architecture/ and https://grafana.com/docs/tempo/latest/reference-tempo-architecture/object-storage/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl cp` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- AWS CLI v2 `aws s3 cp` reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- Boto3 S3 `list_objects_v2` and paginator documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/list_objects_v2.html and https://docs.aws.amazon.com/boto3/latest/guide/paginators.html

## Issues Found
- The Prometheus restore script created a temporary pod with `--rm -it`, then attempted to copy a backup into it after the pod had already exited. It also never extracted the backup into the PVC. I changed the flow to create a sleeping helper pod, wait for readiness, copy the archive, clear and extract the TSDB snapshot into the mounted PVC with `--strip-components=1`, then delete the helper pod.
- The Prometheus restore snippet used an underspecified PVC name. I added a `PVC_CLAIM` variable using the common StatefulSet PVC naming pattern so readers can adjust it explicitly.
- The Loki section treated BoltDB as the current general-purpose index backup target. Grafana documentation now recommends TSDB for Loki 2.8 and newer, while BoltDB Shipper is legacy. I updated the wording to scope the backup advice to BoltDB Shipper deployments and explain that the active local index is the risk before shipping to object storage.
- The Tempo section said `/flush` forces blocks to object storage. Official Tempo documentation says `/flush` flushes in-memory traces to the WAL; `/shutdown` flushes in-memory traces and WAL to long-term storage while shutting down the ingester. I corrected the explanation and comments.
- The Tempo storage overview did not account for newer microservices deployments where Kafka is the durable write-ahead log. I added a caveat that Kafka should be protected according to the Kafka backup and retention policy.
- The Python verification script used `list_objects_v2` with `MaxKeys=10`, then sorted only those returned objects. That can miss the newest object when more than ten backups exist under a prefix. I replaced it with a Boto3 paginator and sort across all returned objects.
- The Python snippet imported `timedelta` but did not use it. I removed the unused import.

## Review Notes
The examples remain intentionally deployment-specific: pod names, PVC names, data paths, and tenant handling may differ by Helm chart, deployment mode, and storage class. The validation script checks recency and plausible size, but a future improvement would be to add full archive integrity checks and periodic restore tests in an isolated namespace.
