# Validation Summary: How to Fix 'pq: could not resize shared memory' Errors in Grafana

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Grafana
- PostgreSQL
- Docker
- Docker Compose
- Kubernetes
- Helm
- Prometheus

## Sources Consulted
- PostgreSQL documentation: Resource Consumption - https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL documentation: Managing Kernel Resources - https://www.postgresql.org/docs/current/kernel-resources.html
- PostgreSQL documentation: Query Planning / effective_cache_size - https://www.postgresql.org/docs/current/runtime-config-query.html
- Docker documentation: Running containers / --shm-size - https://docs.docker.com/engine/containers/run/
- Docker Compose documentation: service shm_size and tmpfs - https://docs.docker.com/reference/compose-file/services/
- Kubernetes documentation: emptyDir volumes and memory-backed emptyDir - https://kubernetes.io/docs/concepts/storage/volumes/
- Grafana documentation: Configure Grafana database settings - https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Bitnami PostgreSQL Helm chart values - https://github.com/bitnami/charts/blob/main/bitnami/postgresql/values.yaml
- Grafana Cloud documentation: Node exporter filesystem metrics - https://grafana.com/docs/grafana-cloud/knowledge-graph/advanced-configuration/enable-prom-metrics-collection/infrastructure/node/

## Issues Found
- The post described PostgreSQL shared memory as being used for caching, sorting, and other operations. I corrected this to distinguish shared buffers and dynamic shared memory, because PostgreSQL `work_mem` covers sort and hash operation memory and is not itself a `/dev/shm` reservation.
- The root-cause section said `shared_buffers` and `work_mem` may exceed available shared memory. I changed this to clarify that `shared_buffers` consumes shared memory at startup, parallel queries can use dynamic shared memory, and `work_mem` contributes to overall memory pressure per operation.
- The memory calculation incorrectly used `shared_buffers + (max_connections * work_mem)` as a `/dev/shm` sizing formula. I replaced it with a shared-memory-oriented estimate based on `shared_buffers`, expected dynamic shared memory headroom, and overhead.
- The Prometheus alert compared `pg_settings_shared_buffers_bytes` to total node memory, which would not directly detect low `/dev/shm` space. I changed the alert to check available space on the `/dev/shm` tmpfs using filesystem metrics.

## Review Notes
The Docker `--shm-size`, Docker Compose `shm_size`, Kubernetes `emptyDir.medium: Memory`, Grafana database environment variable pattern, PostgreSQL memory settings, and Bitnami Helm `primary.extraVolumes` / `primary.extraVolumeMounts` fields were verified against current documentation. The size guideline table remains a rule of thumb rather than a universal formula.
