# How to Use Helm Charts for ClickHouse on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kubernetes, Helm, Helm Chart, K8s, Deployment

Description: Deploy ClickHouse on Kubernetes using Helm charts for repeatable, version-controlled deployments with configurable values and easy upgrades.

---

Helm is the Kubernetes package manager and provides a convenient way to deploy ClickHouse with configurable values, templated manifests, and built-in upgrade and rollback support. This guide covers deploying ClickHouse using the Bitnami Helm chart.

## Prerequisites

- Kubernetes cluster running
- Helm 3 installed and configured
- `kubectl` access to the cluster

## Adding the Helm Repository

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

List available ClickHouse chart versions:

```bash
helm search repo bitnami/clickhouse --versions | head -10
```

## Installing ClickHouse with Default Values

```bash
helm install my-clickhouse bitnami/clickhouse \
  --namespace clickhouse \
  --create-namespace
```

Check the status:

```bash
helm status my-clickhouse -n clickhouse
kubectl get pods -n clickhouse
```

## Customizing the Installation with a values.yaml

Create `values.yaml`:

```yaml
auth:
  username: admin
  password: "strongpassword"
  existingSecret: ""

shards: 2
replicaCount: 2

persistence:
  enabled: true
  size: 50Gi
  storageClass: "standard"

resources:
  requests:
    cpu: "1"
    memory: 4Gi
  limits:
    cpu: "2"
    memory: 8Gi

zookeeper:
  enabled: true
  replicaCount: 3

service:
  type: ClusterIP
  ports:
    http: 8123
    tcp: 9000
```

Install with custom values:

```bash
helm install my-clickhouse bitnami/clickhouse \
  -f values.yaml \
  --namespace clickhouse \
  --create-namespace
```

## Upgrading the Deployment

Modify `values.yaml` and run:

```bash
helm upgrade my-clickhouse bitnami/clickhouse \
  -f values.yaml \
  --namespace clickhouse
```

Upgrade the chart version itself:

```bash
helm upgrade my-clickhouse bitnami/clickhouse \
  --version 6.2.0 \
  -f values.yaml \
  --namespace clickhouse
```

## Rolling Back

If an upgrade causes issues, roll back to the previous release:

```bash
# View release history
helm history my-clickhouse -n clickhouse

# Roll back to revision 1
helm rollback my-clickhouse 1 -n clickhouse
```

## Accessing ClickHouse

Get the service URL:

```bash
kubectl get svc -n clickhouse
```

Port-forward for local access:

```bash
kubectl port-forward -n clickhouse svc/my-clickhouse 8123:8123 9000:9000
```

Connect with clickhouse-client:

```bash
docker run --rm -it --network host clickhouse/clickhouse-client:24.3 \
  --host localhost --port 9000 \
  --user admin --password strongpassword \
  --query "SELECT version();"
```

## Uninstalling

```bash
helm uninstall my-clickhouse -n clickhouse
kubectl delete namespace clickhouse
```

## Summary

Helm charts make ClickHouse deployment on Kubernetes repeatable and version-controlled. The Bitnami chart supports sharding, replication, and ZooKeeper integration through simple values.yaml configuration, enabling you to declaratively manage your ClickHouse cluster alongside other Helm-managed services.
