# Validation Summary: How to Run ClickHouse in Docker and Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- ClickHouse
- ClickHouse Keeper
- Docker
- Docker Compose
- Kubernetes
- Helm
- Altinity Kubernetes Operator for ClickHouse
- Bitnami ClickHouse Helm chart
- Prometheus exporter deployment

## Sources Consulted
- ClickHouse Docker installation documentation: https://clickhouse.com/docs/install/docker
- ClickHouse Keeper configuration documentation: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- ClickHouse cluster deployment / Keeper examples: https://clickhouse.com/docs/architecture/cluster-deployment
- Altinity operator installation documentation: https://docs.altinity.com/altinitykubernetesoperator/quickstartinstallation/
- Altinity operator cluster settings documentation: https://docs.altinity.com/altinitykubernetesoperator/kubernetesoperatorguide/clustersettings/
- Altinity ClickHouse Keeper reference: https://github.com/Altinity/clickhouse-operator/blob/master/docs/keeper_reference.md
- Altinity operator quick start / persistent volume examples: https://github.com/Altinity/clickhouse-operator/blob/master/docs/quick_start.md
- Bitnami ClickHouse Helm chart documentation: https://github.com/bitnami/charts/blob/main/bitnami/clickhouse/README.md
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes pod affinity and anti-affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/

## Issues Found
- The basic Docker examples exposed ClickHouse over HTTP/native ports without configuring the default user for network access. Added `CLICKHOUSE_SKIP_USER_SETUP=1` to make the unauthenticated local examples work as shown.
- The persistence explanation said data disappears when the container stops. Corrected it to say the data is lost when the container is removed unless volumes are mounted.
- The Docker Compose example used the obsolete top-level `version` field. Removed it to match the current Compose Specification.
- The Docker Compose cluster mounted Keeper config files but did not show how to create them. Added a Keeper configuration example with numeric `server_id` values matching the Raft server IDs.
- The Compose startup command used legacy `docker-compose`. Updated it to `docker compose`.
- The Altinity Helm repository URL was outdated. Updated it to `https://helm.altinity.com` and used `helm upgrade --install` with `--create-namespace`.
- The `ClickHouseInstallation` placed query/user memory settings under `configuration.settings`. Moved them to `configuration.profiles`, which is where ClickHouse user profile settings belong in the operator CR.
- The Kubernetes Keeper StatefulSet example used a pod name as `server_id` and string Raft IDs, which does not match ClickHouse Keeper's numeric ID requirement. Replaced it with the Altinity `ClickHouseKeeperInstallation` custom resource and changed the ClickHouse cluster to reference that Keeper resource.
- The Bitnami chart command enabled `zookeeper.enabled=true`, but the current Bitnami chart deploys ClickHouse Keeper by default for sharding/replication and uses `keeper.enabled`. Updated the command accordingly.

## Review Notes
- Several examples use `latest` or older pinned versions such as `24.1`. They are technically valid for a tutorial, but production deployments should pin tested immutable image/chart versions.
- The simple Docker examples intentionally use an insecure default-user shortcut for local access. The later custom-user example is the safer pattern for persistent or shared environments.
