# Configuring Multi-Datacenter Replication for Cassandra on Kubernetes
Author: [nawazdhandala](https://github.com/nawazdhandala)
Tags: Cassandra, Replication, Multi-Datacenter, Kubernetes, Database
Description: A detailed guide to setting up and managing multi-datacenter replication for Apache Cassandra clusters across Kubernetes environments
---

Running Apache Cassandra across multiple datacenters is one of its strongest capabilities. Unlike many distributed databases that bolt on multi-region support as an afterthought, Cassandra was designed from the ground up to operate across geographically distributed datacenters. When combined with Kubernetes, multi-datacenter Cassandra deployments gain the benefits of declarative configuration, automated scaling, and self-healing infrastructure. This guide walks through the architecture, configuration, and operational practices for running Cassandra with multi-datacenter replication on Kubernetes.

## Why Multi-Datacenter Replication?

Multi-datacenter replication serves several critical purposes:

- **Disaster recovery**: If an entire datacenter fails, the other datacenter can continue serving reads and writes without data loss.
- **Geographic locality**: Place data closer to users to reduce read latency.
- **Workload isolation**: Run analytics queries against one datacenter while the other handles transactional workloads.
- **Regulatory compliance**: Keep data copies in specific geographic regions to satisfy data residency requirements.

## Architecture Overview

In a Cassandra multi-datacenter topology, each datacenter is a logical grouping of nodes. Data is replicated across datacenters based on the keyspace replication strategy. The `NetworkTopologyStrategy` is the replication strategy designed specifically for multi-datacenter deployments, allowing you to specify the number of replicas per datacenter independently.

Inter-datacenter communication happens through designated seed nodes and uses a gossip protocol for cluster membership and failure detection. Cassandra uses snitch configuration to map nodes to datacenters and racks.

## Setting Up the Kubernetes Infrastructure

For a true multi-datacenter deployment, you typically have separate Kubernetes clusters in different regions. The K8ssandra operator supports multi-cluster deployments through its control plane and data plane architecture.

First, install the K8ssandra operator on each Kubernetes cluster. Designate one cluster as the control plane:

```bash
# On the control plane cluster
helm repo add k8ssandra https://helm.k8ssandra.io/stable
helm repo update

helm install k8ssandra-operator k8ssandra/k8ssandra-operator \
  --namespace k8ssandra-operator \
  --create-namespace \
  --set controlPlane=true
```

On each data plane cluster:

```bash
helm install k8ssandra-operator k8ssandra/k8ssandra-operator \
  --namespace k8ssandra-operator \
  --create-namespace \
  --set controlPlane=false
```

## Configuring Cross-Cluster Communication

The clusters need to communicate with each other. Create a ClientConfig resource on the control plane cluster for each data plane cluster:

```yaml
apiVersion: config.k8ssandra.io/v1beta1
kind: ClientConfig
metadata:
  name: dc2-client
  namespace: k8ssandra-operator
spec:
  contextName: dc2-cluster
  kubeConfigSecret:
    name: dc2-kubeconfig
    namespace: k8ssandra-operator
```

Generate the kubeconfig for the data plane cluster and store it as a secret:

```bash
# Extract kubeconfig from data plane cluster
kubectl config view --minify --flatten --context=dc2-cluster > dc2-kubeconfig.yaml

# Create secret on control plane cluster
kubectl create secret generic dc2-kubeconfig \
  --from-file=kubeconfig=dc2-kubeconfig.yaml \
  --namespace k8ssandra-operator
```

## Defining the Multi-Datacenter Cluster

With the operator infrastructure in place, define a K8ssandraCluster resource that spans multiple datacenters:

```yaml
apiVersion: k8ssandra.io/v1alpha1
kind: K8ssandraCluster
metadata:
  name: global-cluster
  namespace: cassandra
spec:
  cassandra:
    serverVersion: "4.1.3"
    superuserSecretRef:
      name: cassandra-superuser
    networking:
      hostNetwork: false
    datacenters:
      - metadata:
          name: dc1
        k8sContext: dc1-cluster
        size: 3
        racks:
          - name: rack1
            nodeAffinityLabels:
              topology.kubernetes.io/zone: us-east-1a
          - name: rack2
            nodeAffinityLabels:
              topology.kubernetes.io/zone: us-east-1b
          - name: rack3
            nodeAffinityLabels:
              topology.kubernetes.io/zone: us-east-1c
        storageConfig:
          cassandraDataVolumeClaimSpec:
            storageClassName: gp3
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 200Gi
      - metadata:
          name: dc2
        k8sContext: dc2-cluster
        size: 3
        racks:
          - name: rack1
            nodeAffinityLabels:
              topology.kubernetes.io/zone: eu-west-1a
          - name: rack2
            nodeAffinityLabels:
              topology.kubernetes.io/zone: eu-west-1b
          - name: rack3
            nodeAffinityLabels:
              topology.kubernetes.io/zone: eu-west-1c
        storageConfig:
          cassandraDataVolumeClaimSpec:
            storageClassName: gp3
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 200Gi
```

## Configuring Replication Strategy

Once the cluster is running, create keyspaces with the NetworkTopologyStrategy to control replication per datacenter:

```cql
CREATE KEYSPACE user_data WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'dc1': 3,
  'dc2': 3
};
```

This creates three replicas in each datacenter. For workload isolation scenarios where dc2 is only for analytics, you might use:

```cql
CREATE KEYSPACE analytics_data WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'dc1': 3,
  'dc2': 1
};
```

## Consistency Levels for Multi-Datacenter

Choosing the right consistency level is crucial in multi-datacenter deployments. Here are the key options:

- **LOCAL_ONE**: Reads or writes require acknowledgment from one replica in the local datacenter. Fastest but least consistent.
- **LOCAL_QUORUM**: Requires a quorum of replicas in the local datacenter. The most common choice for multi-datacenter deployments.
- **EACH_QUORUM** (writes only): Requires a quorum in each datacenter. Provides the strongest consistency guarantee but increases write latency.
- **ALL**: Requires acknowledgment from all replicas across all datacenters. Not recommended for multi-datacenter as it makes the entire cluster unavailable if any single node is down.

For most production workloads, use LOCAL_QUORUM for both reads and writes:

```java
SimpleStatement statement = SimpleStatement.builder("SELECT * FROM users WHERE id = ?")
    .setConsistencyLevel(DefaultConsistencyLevel.LOCAL_QUORUM)
    .build();
```

## Network Configuration

Inter-datacenter traffic needs careful network configuration. Cassandra uses different ports for intra-node and inter-datacenter communication:

```yaml
spec:
  cassandra:
    config:
      cassandraYaml:
        storage_port: 7000
        ssl_storage_port: 7001
        native_transport_port: 9042
        internode_encryption: all
        server_encryption_options:
          internode_encryption: all
          keystore: /etc/cassandra/keystores/server-keystore.jks
          keystore_password: changeit
          truststore: /etc/cassandra/keystores/server-truststore.jks
          truststore_password: changeit
```

Ensure that network policies or firewall rules allow traffic on ports 7000-7001 between the Kubernetes clusters:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cassandra-interdc
  namespace: cassandra
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: cassandra
  ingress:
    - from:
        - ipBlock:
            cidr: 10.0.0.0/8
      ports:
        - protocol: TCP
          port: 7000
        - protocol: TCP
          port: 7001
        - protocol: TCP
          port: 9042
```

## Monitoring Multi-Datacenter Health

Monitoring a multi-datacenter Cassandra cluster requires visibility into cross-datacenter replication lag and network health:

```bash
# Check cluster topology
kubectl exec -it global-cluster-dc1-rack1-sts-0 -n cassandra -- \
  nodetool status

# View cross-datacenter streaming
kubectl exec -it global-cluster-dc1-rack1-sts-0 -n cassandra -- \
  nodetool netstats

# Check hints pending delivery to other datacenters
kubectl exec -it global-cluster-dc1-rack1-sts-0 -n cassandra -- \
  nodetool tpstats | grep -i hint
```

Set up alerts for critical multi-datacenter metrics:

```yaml
groups:
  - name: cassandra-multi-dc
    rules:
      - alert: CrossDCLatencyHigh
        expr: cassandra_client_request_latency_p99{scope="CrossDC"} > 500
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Cross-datacenter latency exceeds 500ms"
      - alert: HintedHandoffBacklog
        expr: cassandra_storage_total_hints_in_progress > 1000
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Large hinted handoff backlog indicates DC communication issues"
```

## Handling Datacenter Failures

When an entire datacenter becomes unavailable, applications using LOCAL_QUORUM will continue operating normally against the remaining datacenter. However, you should take several steps:

1. Verify applications are routing to the healthy datacenter
2. Monitor the healthy datacenter for increased load
3. Check for hinted handoff accumulation

When the failed datacenter recovers:

```bash
# Run repair on the recovered datacenter
kubectl exec -it global-cluster-dc2-rack1-sts-0 -n cassandra -- \
  nodetool repair -dc dc2 --full
```

## Adding a New Datacenter

To expand to a third datacenter, update the K8ssandraCluster resource:

```yaml
datacenters:
  # existing dc1 and dc2...
  - metadata:
      name: dc3
    k8sContext: dc3-cluster
    size: 3
    storageConfig:
      cassandraDataVolumeClaimSpec:
        storageClassName: gp3
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 200Gi
```

After the new datacenter joins the cluster, update your keyspace replication and run repair:

```cql
ALTER KEYSPACE user_data WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'dc1': 3,
  'dc2': 3,
  'dc3': 3
};
```

```bash
# Rebuild the new datacenter from an existing one
kubectl exec -it global-cluster-dc3-rack1-sts-0 -n cassandra -- \
  nodetool rebuild dc1
```

## Conclusion

Multi-datacenter replication with Cassandra on Kubernetes provides a powerful foundation for globally distributed, highly available data infrastructure. The K8ssandra operator simplifies much of the operational complexity by managing cross-cluster communication and Cassandra configuration declaratively. By choosing appropriate consistency levels, properly configuring network connectivity, and monitoring cross-datacenter metrics, you can run a Cassandra deployment that survives datacenter failures, serves users with low latency worldwide, and meets data residency requirements. The key is to test failure scenarios regularly and ensure your application code handles datacenter-aware routing correctly.
