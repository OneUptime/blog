# Validation Summary: How to Run Stateful Applications in Kubernetes (PostgreSQL, Redis, Kafka)

## Status
validated

## Post Type
Guide / Tutorial (production-oriented, configuration-heavy)

## Technologies Covered
- Kubernetes StatefulSets, Services (headless), PersistentVolumeClaims / volumeClaimTemplates
- PostgreSQL (`postgres:15`), Patroni, Zalando Postgres Operator
- Redis (`redis:7`): single instance, Redis Cluster, Redis Sentinel
- Apache Kafka (`confluentinc/cp-kafka:7.5.0`) with ZooKeeper and with KRaft; Strimzi Operator
- StorageClasses (AWS EBS gp3 / GCP pd-ssd), VolumeSnapshots
- PodDisruptionBudgets
- Prometheus Operator (ServiceMonitor, PrometheusRule), postgres_exporter

## Sources Consulted
- Kubernetes JSONPath Support — https://kubernetes.io/docs/reference/kubectl/jsonpath/ (confirmed `{range .items[*]}` requires a space after `range`)
- Kubernetes StatefulSets — https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StorageClass / VolumeSnapshot docs — https://kubernetes.io/docs/concepts/storage/
- Confluent Platform Docker config reference (cp-kafka / cp-zookeeper env vars, KRaft) — https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Strimzi Kafka custom resource (apiVersion `kafka.strimzi.io/v1beta2`) — https://strimzi.io/docs/operators/latest/
- Zalando Postgres Operator manifest reference (`acid.zalan.do/v1`) — https://opensource.zalando.com/postgres-operator/
- Redis official image documentation (Debian-based; `/bin/sh` is dash) — https://hub.docker.com/_/redis
- Redis Cluster tutorial (`redis-cli --cluster create --cluster-replicas`) — https://redis.io/docs/management/scaling/

## Issues Found
1. **Invalid kubectl JSONPath in the Redis Cluster init command** (Redis Cluster section). The template was `'{range.items[*]}...'` with no space between `range` and `.items`. The kubectl JSONPath `range` operator requires a space (`{range .items[*]}`); the original form errors out. Fixed to `'{range .items[*]}{.status.podIP}:6379 {end}'`.
2. **Redis Sentinel init container used `/bin/sh` with a bash-only construct.** The container ran `command: ["/bin/sh", "-c"]` but the script uses `[[ ${HOSTNAME} == "redis-0" ]]`. The `redis:7` official image is Debian-based, where `/bin/sh` is `dash`, which does not support `[[ ]]` and would fail with a syntax error. Changed the shell to `/bin/bash` (consistent with the ZooKeeper and Kafka examples in the same post, which already use `/bin/bash`).

## Review Notes
- **`image: patroni:latest`** (PostgreSQL HA with Patroni section) is illustrative — there is no official `patroni` image published under that name on Docker Hub. In practice you build a custom Patroni image or use Zalando's Spilo image (e.g. `ghcr.io/zalando/spilo-*`). The `PATRONI_*` environment variables shown are consistent with Patroni's Kubernetes/Spilo configuration, so the example is conceptually correct; left unchanged as a clearly illustrative placeholder.
- The Strimzi example pins Kafka `3.5.1` and includes a ZooKeeper section. The comment "still required for some Kafka versions" is accurate for that version; newer Kafka/Strimzi releases default to KRaft and remove ZooKeeper. Version-specific but not incorrect as written.
- The basic PostgreSQL probes run `pg_isready -U postgres` while the `POSTGRES_USER` comes from a secret. `pg_isready` only checks server acceptance of connections and returns success regardless of whether the role exists, so this works; if the deployed user is not `postgres` the probe still functions. Minor stylistic note, not an error.
- The Kafka-with-ZooKeeper StatefulSet advertises an `EXTERNAL` listener on 9093 but only declares `containerPort: 9092`; `ports` entries are informational in Kubernetes and do not gate traffic, so this is harmless. The two StorageClass examples intentionally share the name `fast-ssd` as cloud-specific alternatives.
- KRaft example: `CLUSTER_ID` value is a valid sample base64 UUID; in real deployments generate a fresh one with `kafka-storage.sh random-uuid` as the comment indicates. Combined `broker,controller` roles with 3 nodes is a valid (non-isolated) topology.
