# How to Document Calico Typha Architecture for Operators

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Architecture, Networking, Scalability

Description: A guide to documenting Calico Typha's architecture, its role in cluster scalability, and how operators should understand its components and data flow.

---

## Introduction

Typha is an optional but highly recommended component in the Calico architecture that sits between the Kubernetes API server (or etcd datastore) and the Felix agents running on each node. Without Typha, every Felix instance independently watches the datastore for changes, which creates significant load on the API server as clusters grow beyond 100 nodes.

Typha solves this by acting as a fan-out proxy. A small number of Typha instances watch the datastore, and all Felix agents connect to Typha instead. This reduces the number of direct API server watches from potentially thousands to just a handful, making Calico viable at very large scale.

Documenting Typha's architecture helps operators understand why it exists, how data flows through it, and what happens when Typha instances become unavailable. This knowledge is essential for capacity planning, incident response, and cluster scaling decisions.

## Prerequisites

- Kubernetes cluster with Calico v3.25+ and Typha enabled
- `kubectl` access with cluster-admin privileges
- `calicoctl` CLI installed
- Basic understanding of Calico components (Felix, BIRD, confd)

## Understanding the Typha Data Flow

Document the data flow path in your cluster:

```
Kubernetes API Server
        |
        v
  Typha Instances (2-3 replicas)
        |
        v
  Felix (on every node)
        |
        v
  Data Plane (iptables/BPF)
```

Verify Typha is running and how many replicas exist:

```bash
# Check Typha deployment
kubectl get deployment -n calico-system calico-typha

# View Typha pods and their node placement
kubectl get pods -n calico-system -l k8s-app=calico-typha -o wide
```

## Documenting Typha's Role

Typha serves three main functions that should be documented:

### Datastore Fan-Out

```bash
# Check how many Felix instances are connecting to each Typha
kubectl logs -n calico-system -l k8s-app=calico-typha --tail=50 | grep "connection"
```

Each Typha instance maintains a single watch on the API server and fans out updates to all connected Felix instances. Document the current ratio of Felix-to-Typha connections.

### Snapshot and Sync

When a Felix agent starts or reconnects, Typha sends a full snapshot of the current state before streaming incremental updates. This is more efficient than Felix performing its own full list from the API server.

### Validation and Filtering

Typha validates and pre-processes resources before sending them to Felix, reducing the processing burden on each node.

## Mapping Typha to Felix Connections

Document which Felix instances connect to which Typha pod:

```bash
# Check Felix configuration for Typha connection
kubectl get configmap -n calico-system --selector=k8s-app=calico-node -o yaml | grep -i typha

# View Typha service endpoints
kubectl get endpoints -n calico-system calico-typha

# Check Felix logs for Typha connection status
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node --tail=20 | grep -i "typha"
```

## Documenting High Availability

Typha should always run with multiple replicas. Document your HA configuration:

```bash
# Check replica count and pod disruption budget
kubectl get deployment -n calico-system calico-typha -o yaml | grep replicas
kubectl get pdb -n calico-system

# Verify Typha pods are spread across nodes
kubectl get pods -n calico-system -l k8s-app=calico-typha -o wide
```

Document the anti-affinity rules that ensure Typha pods run on different nodes:

```bash
kubectl get deployment -n calico-system calico-typha -o yaml | grep -A 15 "affinity"
```

## Capacity Planning Documentation

Include capacity guidelines in your documentation:

```bash
# Count total nodes (Felix instances)
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)

# Recommended Typha replicas (1 per 200 nodes, minimum 2)
echo "Nodes: $NODE_COUNT"
echo "Recommended Typha replicas: $(( (NODE_COUNT / 200) + 2 ))"

# Check current resource limits
kubectl get deployment -n calico-system calico-typha -o yaml | grep -A 10 "resources"
```

Document the scaling formula and resource requirements so operators know when to add more Typha replicas.

## Documenting Failure Scenarios

Include these failure scenarios in your architecture documentation:

### Single Typha Pod Failure

```bash
# Simulate by checking what happens if one pod is removed
kubectl get pods -n calico-system -l k8s-app=calico-typha
# Felix agents connected to the failed Typha will reconnect to remaining instances
```

### All Typha Pods Unavailable

If all Typha instances fail, Felix agents cannot receive updates from the datastore. Existing rules remain in place but no new policy changes will be applied until Typha recovers.

### Typha-API Server Connectivity Loss

If Typha loses connectivity to the API server, it will stop sending updates to Felix. Felix will continue operating with its last known configuration.

## Verification

Verify your architecture documentation is accurate:

```bash
# Confirm Typha is running and healthy
kubectl get pods -n calico-system -l k8s-app=calico-typha -o wide

# Check Typha metrics endpoint
kubectl exec -n calico-system $(kubectl get pod -n calico-system -l k8s-app=calico-typha -o name | head -1) -- wget -qO- http://localhost:9093/metrics | head -20

# Verify Felix-to-Typha connections are active
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node --tail=5 | grep -i "typha"
```

## Troubleshooting

**Typha pods not starting**: Check resource quotas and node affinity rules. Typha requires sufficient memory to cache the full datastore state.

```bash
kubectl describe pod -n calico-system -l k8s-app=calico-typha | grep -A 10 "Events"
```

**Felix unable to connect to Typha**: Verify the Typha service and endpoints are correctly configured. Check network policies that might block Felix-to-Typha communication.

**High memory usage on Typha**: In large clusters with many NetworkPolicy resources, Typha caches all policy objects in memory. Monitor memory usage and increase resource limits as needed.

## Conclusion

Documenting Calico Typha's architecture provides operators with the context they need to manage and scale the networking layer effectively. By recording the data flow, HA configuration, capacity guidelines, and failure scenarios, your team will be prepared to handle both routine scaling and unexpected incidents. Review and update this documentation whenever you change Typha's replica count, resource limits, or deployment topology.
