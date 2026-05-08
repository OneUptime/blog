# How to Understand Typha in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Architecture, Scalability

Description: An explanation of what Typha is, why it exists, and how it fits into a manually installed Calico cluster.

---

## Introduction

Typha is a fan-out component in the Calico architecture that sits between the Kubernetes API server and the Felix agents running on each node. Without Typha, every Felix instance watches the Kubernetes API directly. In clusters with hundreds or thousands of nodes, this creates significant API server load - each Felix maintains its own watch connection and processes all events independently.

Typha solves this by acting as an aggregating proxy: each Typha replica maintains its own datastore watch connection and fans out updates to connected Felix agents. This reduces API server load by a large factor and also provides a coalescing function - Typha caches datastore state and deduplicates events before fanning them out, eliminating redundant processing.

## Why Typha Matters in Hard Way Installations

"Calico the Hard Way" refers to manual manifest-based Calico installation without the Tigera Operator. In operator-based installations, Typha is automatically deployed and configured. In hard way installations, you deploy and configure Typha yourself.

Understanding Typha is essential in hard way installations because:

- Felix's connection to Typha (or directly to the API server) is controlled by Felix's configuration
- TLS certificates must be manually generated and configured for Felix-to-Typha authentication
- Typha replicas must be manually scaled as the cluster grows
- Typha's health must be monitored independently

## How Typha Works

```plaintext
Felix on each node
  └──► Typha (1-3 replicas)
           └──► Kubernetes API server (1 watch connection per Typha replica)
```

Without Typha (small clusters, <50 nodes):
```plaintext
Felix (x50) ──► Kubernetes API server (50 watch connections)
```

With Typha (large clusters, >50 nodes):
```plaintext
Felix (x500) ──► Typha (x3) ──► Kubernetes API server (3 watch connections)
```

The reduction in API server connections is proportional to `(nodes / typha_replicas)`.

## Typha's Role in Policy Updates

When a NetworkPolicy or GlobalNetworkPolicy is created or modified:

1. The API server stores the change
2. Typha's watch on the API server delivers the event to Typha
3. Typha fans the update out to all connected Felix agents
4. Each Felix programs the update into iptables/nftables on its node

Typha coalesces rapid policy changes by caching state and deduplicating events before sending them to Felix. This reduces the number of redundant updates each node needs to process.

## When to Deploy Typha

The Calico project recommends deploying Typha for Kubernetes API datastore clusters with more than 50 nodes. For clusters with 50 nodes or less, Calico's manifest-based installation path can run without Typha, while operator-based installations include Typha automatically.

```bash
# Check node count

kubectl get nodes --no-headers | wc -l
```

Deploy Typha if this returns more than 50.

## Typha and calicoctl

In etcd-based Calico deployments, Typha can watch etcd instead of the Kubernetes API, but Calico documentation notes that this is usually redundant with etcd v3 and is not recommended. For Kubernetes-datastore deployments (the standard mode for Kubernetes), Typha watches the Kubernetes API server using a service account with appropriate RBAC permissions.

```bash
# Verify Typha is connecting to the correct datastore
kubectl get deployment -n kube-system calico-typha -o yaml | grep TYPHA_DATASTORETYPE -A1
```

## Conclusion

Typha is a scalability component that reduces Kubernetes API server load in large Calico deployments by aggregating watch connections and coalescing policy updates. In hard way installations, Typha must be manually deployed, configured with TLS certificates, and scaled as the cluster grows. Understanding Typha's role in the Calico architecture - particularly its fan-out and coalescing functions - is the foundation for correctly deploying and operating it in a manually managed cluster.
