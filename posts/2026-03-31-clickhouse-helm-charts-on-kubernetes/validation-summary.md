# Validation Summary: How to Use Helm Charts for ClickHouse on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Kubernetes
- Helm 3
- Bitnami Helm chart for ClickHouse
- kubectl
- ZooKeeper
- Docker (for clickhouse-client)

## Sources Consulted
- Bitnami Helm charts repository for ClickHouse: https://github.com/bitnami/charts/tree/main/bitnami/clickhouse
- Bitnami Helm charts index: https://charts.bitnami.com/bitnami
- Helm CLI reference: https://helm.sh/docs/helm/
- kubectl port-forward documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#port-forward
- ClickHouse client documentation: https://clickhouse.com/docs/en/interfaces/cli
- Docker networking reference (--network host): https://docs.docker.com/network/drivers/host/

## Issues Found
1. **Port-forward did not expose the native TCP port (9000).**
   - The original `kubectl port-forward` command only forwarded the HTTP port (8123), but the following `clickhouse-client` command connects to port 9000. The client command would fail because nothing would be listening on 9000 locally.
   - Fixed by adding `9000:9000` to the port-forward command so both the HTTP and native TCP ports are exposed.

2. **Docker client could not reach the port-forwarded host port.**
   - The original `docker run ... --host localhost --port 9000` would not reach the host-side port-forward because, inside a container, `localhost` refers to the container itself (on Linux, without host networking).
   - Fixed by adding `--network host` to the `docker run` invocation so the container shares the host's network namespace and can reach the port-forwarded ports on `localhost`.

## Review Notes
- The Bitnami ClickHouse chart `values.yaml` keys used in the post (`auth.username`, `auth.password`, `auth.existingSecret`, `shards`, `replicaCount`, `persistence.*`, `resources.*`, `zookeeper.*`, `service.type`, `service.ports.http`, `service.ports.tcp`) match the current chart's value schema.
- The example chart version `6.2.0` is used only as an illustration of the `--version` flag; readers should run `helm search repo bitnami/clickhouse --versions` to choose an actual available version. The chart version may change over time; no change made since it is a demonstrative value.
- `--network host` works on Linux. On Docker Desktop (macOS/Windows), users may prefer `--add-host=host.docker.internal:host-gateway` and `--host host.docker.internal` instead. The post's Linux-friendly variant is kept for consistency with typical `kubectl`/Helm tutorials.
- Bitnami has been restructuring their free public image/chart distribution; the `charts.bitnami.com/bitnami` index is still valid as of this review but could change in the future.
- The `clickhouse/clickhouse-client:24.3` Docker tag is a valid published ClickHouse client image; users may wish to pick a more recent version matching their server.
