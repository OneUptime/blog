# How to Design Rancher Architecture for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Architecture, Production, High Availability, Kubernetes, Design

Description: Design a production-grade Rancher architecture with high availability, multi-cluster management, network topology, storage strategy, and security considerations for enterprise deployments.

## Introduction

A production Rancher architecture must address high availability, scalability, security, and operational simplicity. Poor architectural decisions-single-point-of-failure management planes, undersized etcd clusters, flat network topologies-lead to outages and security incidents. This guide covers the key architectural decisions for a production Rancher deployment.

## Reference Architecture

```text
                    ┌─────────────────────────────┐
                    │   Layer 4 Load Balancer     │
                    │  (AWS NLB / F5 / HAProxy)   │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
    ┌─────────▼──────┐   ┌─────────▼──────┐   ┌────────▼───────┐
    │  Rancher Node 1│   │  Rancher Node 2│   │  Rancher Node 3│
    │  (RKE2 CP)     │   │  (RKE2 CP)     │   │  (RKE2 CP)     │
    └────────────────┘   └────────────────┘   └────────────────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │ manages
              ┌────────────────────┼────────────────────┐
              │                    │                    │
    ┌─────────▼──────┐   ┌─────────▼──────┐   ┌────────▼───────┐
    │  Production    │   │  Staging       │   │  Dev/Test      │
    │  Cluster       │   │  Cluster       │   │  Clusters      │
    └────────────────┘   └────────────────┘   └────────────────┘
```

## Decision 1: Rancher Management Cluster

Use a dedicated RKE2 cluster (not a downstream workload cluster) for Rancher:

```yaml
# Use a fixed registration address that resolves to a layer 4 load balancer.

# /etc/rancher/rke2/config.yaml on the first server
token: my-shared-secret
tls-san:
  - rancher.internal.com

---

# /etc/rancher/rke2/config.yaml on rancher-2 and rancher-3
server: https://rancher.internal.com:9345
token: my-shared-secret
tls-san:
  - rancher.internal.com

# Sizing guidelines for management cluster:
# Up to 150 clusters / 1500 nodes: 4 vCPU, 16 GB RAM per node
# Up to 300 clusters / 3000 nodes: 8 vCPU, 32 GB RAM per node
# Up to 500 clusters / 5000 nodes: 16 vCPU, 64 GB RAM per node
```

## Decision 2: etcd Configuration

```bash
# Dedicated etcd nodes for high cluster counts
# etcd should have dedicated SSD-backed storage for low latency

# Recommended etcd storage performance
# - wal_fsync_duration_seconds p99 < 10ms
# - Use dedicated SSDs in production; NVMe is preferred when available

# Verify etcd health from an RKE2 server node
ETCDCTL_API=3 \
/var/lib/rancher/rke2/bin/etcdctl \
  --cacert=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/rke2/server/tls/etcd/server-client.crt \
  --key=/var/lib/rancher/rke2/server/tls/etcd/server-client.key \
  --endpoints=https://127.0.0.1:2379 endpoint health
```

## Decision 3: Network Architecture

```yaml
# Separate networks for security and performance
networks:
  management:     10.0.0.0/24    # Rancher management plane
  pod:            10.42.0.0/16   # Pod network (example RKE2 default)
  service:        10.43.0.0/16   # Service CIDR (example RKE2 default)
  storage:        10.0.1.0/24    # Storage replication traffic

# CNI selection:
# - Canal: RKE2 default; combines Flannel overlay networking with Calico network policy
# - Calico: Supports network policy and optional eBPF dataplane
# - Flannel: Simplest option, but it does not provide network policies
# - Cilium: eBPF-based with strong observability and security policy features
```

## Decision 4: Storage Strategy

```bash
# Longhorn for Rancher-native distributed storage
helm repo add longhorn https://charts.longhorn.io
helm repo update
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --set defaultSettings.defaultReplicaCount=3 \
  --set defaultSettings.storageMinimalAvailablePercentage=15 \
  --set defaultSettings.storageReservedPercentageForDefaultDisk=25
```

```yaml
# For databases: dedicated storage class backed by local PVs on SSDs
# Requires manually created local PersistentVolume objects on the database nodes.
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-ssd
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
```

## Decision 5: Multi-Tenancy Model

```yaml
# Rancher Project = namespace grouping + RBAC boundary
# Each team gets a Project with ResourceQuota

apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: team-a-production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    persistentvolumeclaims: "20"
    services.loadbalancers: "5"
```

## Decision 6: Backup and DR

```bash
# Rancher backup (management plane)
helm repo add rancher-charts https://charts.rancher.io
helm repo update
# Choose a CHART_VERSION compatible with your Rancher release.
CHART_VERSION=<rancher-backup-chart-version>

helm install rancher-backup-crd rancher-charts/rancher-backup-crd \
  --namespace cattle-resources-system \
  --create-namespace \
  --version ${CHART_VERSION}

helm install rancher-backup rancher-charts/rancher-backup \
  --namespace cattle-resources-system \
  --version ${CHART_VERSION} \
  --set persistence.enabled=true \
  --set persistence.storageClass=longhorn

# Create recurring backup
# Pre-create the s3-creds Secret with accessKey and secretKey in cattle-resources-system.
kubectl apply -f - <<EOF
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-daily-backup
spec:
  resourceSetName: rancher-resource-set-full
  storageLocation:
    s3:
      credentialSecretName: s3-creds
      credentialSecretNamespace: cattle-resources-system
      bucketName: rancher-backups
      folder: rancher-management
      region: us-east-1
      endpoint: s3.us-east-1.amazonaws.com
  schedule: "0 2 * * *"       # Daily at 2 AM
  retentionCount: 14           # Keep 14 backups
EOF
```

## Production Checklist

- 3-node Rancher management cluster (HA)
- Dedicated etcd on NVMe SSDs
- External load balancer with health checks
- Separate management, pod, and storage networks
- Longhorn with 3 replicas for stateful workloads
- Daily automated backups to S3
- Monitoring stack (Prometheus + Grafana) deployed
- RBAC roles aligned to team structure
- Network policies enforcing namespace isolation
- cert-manager managing TLS certificates

## Conclusion

Production Rancher architecture requires careful planning across HA, networking, storage, and security dimensions. A 3-node management cluster running on RKE2 with dedicated etcd SSDs handles hundreds of downstream clusters reliably. Combining Longhorn storage, Fleet GitOps, and Prometheus monitoring creates a self-contained, operationally simple platform for enterprise Kubernetes management.
