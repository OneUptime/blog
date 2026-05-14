# How to Understand Calico Networking Architecture

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Architecture, CNI, Felix, BIRD, Typha, Confd

Description: A deep dive into Calico's architectural components - Felix, BIRD, confd, Typha, and the Calico API server - and how they work together to implement Kubernetes networking.

---

## Introduction

Calico is not a single binary - it is a system of cooperating components, each with a specific role in the networking architecture. Understanding what each component does, how they communicate, and what happens when one fails is essential for operating Calico in production and diagnosing networking incidents effectively.

The core Calico components are Felix (the node agent), BIRD (the BGP daemon), confd (the configuration renderer), Typha (the fanout proxy for the datastore), and the CNI plugin. Each runs in a specific context and has specific failure modes.

## Prerequisites

- Basic familiarity with Kubernetes DaemonSets and system components
- Understanding of what a CNI plugin does
- Awareness of BGP routing concepts (for BIRD sections)

## Component Overview

```mermaid
graph TD
    K8sAPI[Kubernetes API Server] --> Typha[Typha\nDatastore proxy]
    Typha --> Felix[Felix\nNode agent]
    Felix --> iptables[iptables/eBPF\nDataplane]
    Felix --> BIRD[BIRD\nBGP daemon]
    BIRD --> BGP[BGP peers\nOther nodes or ToR switches]
    confd[confd\nConfig renderer] --> BIRD
    Typha --> confd
    CNI[Calico CNI Plugin] --> IPAM[IPAM\nDatastore]
    K8sAPI --> CNI
```

## Felix: The Node Agent

Felix is the heart of Calico. It runs as a DaemonSet on every node and is responsible for:

- **Policy enforcement**: Translating Calico NetworkPolicy into iptables rules or eBPF programs
- **Route programming**: Adding host routes for pod IPs on the local node
- **Interface management**: Programming host interfaces so traffic is correctly routed to local workload endpoints
- **Health reporting**: Reporting node readiness status

Felix watches the Calico datastore (via Typha) for changes to policies, endpoints, and IP pools, then reconciles the local node's network state.

```bash
# Check Felix health

kubectl get pods -n calico-system -l k8s-app=calico-node
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | grep "Felix"
```

## BIRD: The BGP Daemon

BIRD (Bird Internet Routing Daemon) handles BGP routing in Calico. It runs inside the `calico-node` pod and:

- Advertises pod CIDR routes to BGP peers (other nodes or top-of-rack switches)
- Learns routes from peers and installs them in the node's routing table for the Linux dataplane
- Maintains BGP session state with all configured peers

BIRD is optional - it is required when BGP is used to distribute cluster routes or advertise routes to external peers. For VXLAN pools, BGP is not required for internal cluster routing; for IP-in-IP or unencapsulated pools, BGP distributes cluster routes by default unless Felix cluster route programming is explicitly enabled.

```bash
# Check BIRD status in a calico-node pod
POD=$(kubectl get pods -n calico-system -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n calico-system "$POD" \
  -c calico-node -- birdcl show protocols
```

## confd: The Configuration Renderer

confd watches the Calico datastore and renders BGP configuration files for BIRD. When BGP peer configuration changes (new peers added, old ones removed), confd re-renders the BIRD configuration and signals BIRD to reload.

confd is the bridge between Calico's data model (stored in Kubernetes CRDs) and BIRD's configuration format.

## Typha: The Datastore Fanout Proxy

In large clusters, every Felix instance watching the Kubernetes API server directly creates excessive load on the API server. Typha solves this by acting as a proxy:

- Typha maintains a single watch on the Calico CRDs in the Kubernetes API server
- Felix connects to Typha, not the API server directly
- Typha fans out updates to all connected Felix instances

```mermaid
graph LR
    K8sAPI[Kubernetes API\n1 watch connection] --> Typha[Typha\n1 connection in, N out]
    Typha --> Felix1[Felix Node 1]
    Typha --> Felix2[Felix Node 2]
    Typha --> FelixN[Felix Node N]
```

Operator installations deploy Typha automatically, and may run one or more Typha instances depending on cluster scale. In manifest-based installations, Typha is optional but strongly recommended for high-scale Kubernetes clusters (100+ nodes).

## The CNI Plugin

The Calico CNI plugin is invoked by kubelet for each new pod. It:
1. Calls Calico IPAM to allocate a pod IP
2. Creates the veth pair and configures the pod's network namespace
3. Creates the workload endpoint data that Felix watches, and can wait for Felix to report that policy has been programmed before the pod starts

The CNI plugin runs as a binary on each node, not as a pod.

## Best Practices

- Monitor Calico components via Prometheus metrics where available - Felix, Typha, and kube-controllers expose metrics; monitor BIRD/BGP health with `calicoctl node status` or `birdcl`
- Enable Typha when your cluster exceeds 100 nodes to reduce API server load
- Set appropriate resource limits on calico-node pods - Felix and BIRD are sensitive to CPU and memory constraints during policy churn

## Conclusion

Calico's architecture distributes responsibility across Felix (policy enforcement and routing), BIRD (BGP routing), confd (configuration rendering), Typha (API server fanout), and the CNI plugin (pod network setup). Understanding each component's role and failure modes lets you diagnose incidents accurately and design monitoring that covers the full networking stack.
