# How to Configure Rancher Server for 1000+ Clusters - Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Enterprise Scale, 1000 Clusters, Performance, Architecture, High Availability

Description: Architecture and configuration guide for running Rancher Server at 1000+ cluster scale with external databases, horizontal scaling, and optimized agent configurations.

## Introduction

Running Rancher at 1000+ cluster scale requires treating the Rancher Server itself as a production service with external dependencies, horizontal scaling, and careful capacity planning. This is the domain of Rancher Prime, SUSE's enterprise offering, though many optimizations apply to the open-source version too.

## Architecture Overview

```mermaid
graph TD
    A[External Load Balancer] --> G[Dedicated Management Cluster]
    G --> B[Rancher Server Pod 1]
    G --> C[Rancher Server Pod 2]
    G --> D[Rancher Server Pod 3]
    G --> E[Rancher Server Pod N]
    G --> H[etcd - 3 Dedicated Nodes]
    G --> I[Control Plane - 3 Nodes]
```

## Step 1: Configure the Management Cluster Datastore

Rancher on Kubernetes stores its state in the management cluster datastore, not in Rancher-specific database environment variables. For RKE2, embedded etcd is the default HA datastore. If you intentionally use an external PostgreSQL datastore for the RKE2 management cluster, configure it in RKE2 itself:

```yaml
# /etc/rancher/rke2/config.yaml

datastore-endpoint: "postgres://username:password@postgres-ha.example.com:5432/database-name"
token: "REPLACE_WITH_SHARED_CLUSTER_TOKEN"

# Optional TLS files for client certificate authentication:
# datastore-cafile: /etc/rancher/rke2/certs/db-ca.pem
# datastore-certfile: /etc/rancher/rke2/certs/db-client.crt
# datastore-keyfile: /etc/rancher/rke2/certs/db-client.key

# RKE2 external datastores require prepared statement support.
# PgBouncer may need additional configuration.
```

## Step 2: Scale Rancher Server Pods

```yaml
# rancher-values.yaml
replicas: 10    # Example starting point for a large deployment

resources:
  requests:
    cpu: "4"
    memory: "8Gi"
  limits:
    cpu: "8"
    memory: "16Gi"
```

The Rancher Helm chart supports `replicas` and `resources`. If you want automatic scaling, create a separate Kubernetes `HorizontalPodAutoscaler`; the Rancher chart does not define an `autoscaling` values block.

## Step 3: Tune Local Cluster etcd for Large State

```yaml
# /etc/rancher/rke2/config.yaml
etcd-snapshot-schedule-cron: "0 */6 * * *"
etcd-snapshot-retention: 28
etcd-snapshot-compress: true
```

Start with RKE2's supported snapshot and backup settings, and only change low-level `etcd-arg` values after measuring RTT and backend growth. etcd recommends sizing heartbeat and election values from network round-trip time, and documents 8 GiB as the suggested backend quota maximum for normal environments.

## Step 4: Dedicated etcd Infrastructure

For the local cluster:
- 3 dedicated etcd nodes (no user workloads)
- Fast SSD-backed storage
- Low-latency, reliable network between etcd nodes
- Separate availability zones within the same region

## Step 5: Optimize Cattle Agent Connections

Each downstream cluster has a `cattle-cluster-agent` that opens a tunnel back to Rancher. At 1000+ clusters, make sure the load balancer supports long-lived WebSocket connections and preserves the required proxy headers:

- `Host`
- `X-Forwarded-Proto`
- `X-Forwarded-Port`
- `X-Forwarded-For`

Recommended timeout starting points:
- Read timeout: 1800 seconds
- Write timeout: 1800 seconds
- Connect timeout: 30 seconds

## Step 6: Rancher Prime for Supported Scale

Rancher Prime includes:
- Greater security assurances
- Extended lifecycles
- Access to focused architectures and Kubernetes advisories
- Options for production support

## Conclusion

Running Rancher at 1000+ cluster scale is an enterprise undertaking that requires careful infrastructure planning, a dedicated HA management cluster, and horizontal scaling of the Rancher Server itself. The combination of correctly sized Rancher Server replicas, dedicated etcd nodes, and load balancer settings that preserve long-lived agent connections enables stable operation at this scale.
