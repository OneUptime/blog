# How to Use ClickHouse Operator (Altinity) on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kubernetes, Altinity, Operator, K8s, Deployment

Description: Learn how to deploy and manage ClickHouse on Kubernetes using the Altinity ClickHouse Operator for automated cluster lifecycle management.

---

The Altinity ClickHouse Operator is the most widely adopted Kubernetes operator for managing ClickHouse clusters. It automates cluster provisioning, configuration, scaling, and upgrades through Kubernetes-native Custom Resource Definitions (CRDs).

## Prerequisites

- A running Kubernetes cluster (1.25+)
- `kubectl` configured to access the cluster

## Installing the Altinity Operator

Install the operator using the official manifest:

```bash
kubectl apply -f https://raw.githubusercontent.com/Altinity/clickhouse-operator/master/deploy/operator/clickhouse-operator-install-bundle.yaml
```

Verify the operator is running:

```bash
kubectl get pods -n kube-system | grep clickhouse
```

## Creating a ClickHouseInstallation

The operator introduces the `ClickHouseInstallation` (CHI) custom resource. Create `chi-basic.yaml`:

```yaml
apiVersion: "clickhouse.altinity.com/v1"
kind: ClickHouseInstallation
metadata:
  name: ch-cluster
  namespace: default
spec:
  configuration:
    clusters:
      - name: "production"
        layout:
          shardsCount: 2
          replicasCount: 2
    zookeeper:
      nodes:
        - host: zookeeper.default.svc.cluster.local
          port: 2181
  defaults:
    templates:
      podTemplate: pod-template
      dataVolumeClaimTemplate: data-volume

  templates:
    podTemplates:
      - name: pod-template
        spec:
          containers:
            - name: clickhouse
              image: clickhouse/clickhouse-server:24.3
              resources:
                requests:
                  memory: 4Gi
                  cpu: "2"
                limits:
                  memory: 8Gi
                  cpu: "4"

    volumeClaimTemplates:
      - name: data-volume
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 100Gi
```

Apply the resource:

```bash
kubectl apply -f chi-basic.yaml
```

## Monitoring the Deployment

```bash
# Watch the CHI status
kubectl get chi -w

# Check created pods
kubectl get pods -l clickhouse.altinity.com/chi=ch-cluster

# View operator logs
kubectl logs -n kube-system -l app=clickhouse-operator -f
```

## Connecting to the Cluster

The operator creates services for each shard. Get the service endpoint:

```bash
kubectl get svc | grep chi-ch-cluster
```

Port-forward for local access:

```bash
kubectl port-forward svc/chi-ch-cluster-production-0-0 8123:8123
```

## Scaling the Cluster

Update the `shardsCount` or `replicasCount` in your CHI resource and apply:

```bash
kubectl apply -f chi-basic.yaml
```

The operator will orchestrate the scale-out operation, adding new pods and configuring replication.

## Upgrading ClickHouse Version

Update the image tag in the pod template and apply:

```yaml
image: clickhouse/clickhouse-server:24.8
```

```bash
kubectl apply -f chi-basic.yaml
```

The operator performs a rolling upgrade, restarting one replica at a time.

## Summary

The Altinity ClickHouse Operator transforms ClickHouse cluster management on Kubernetes into a declarative, GitOps-friendly workflow. By defining your cluster topology in a `ClickHouseInstallation` manifest, you get automated provisioning, scaling, and upgrades with minimal manual intervention.
