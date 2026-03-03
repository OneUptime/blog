# How to Plan Multi-Cluster Istio Architecture

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Architecture, Multi-Cluster, Kubernetes, Planning

Description: A guide to choosing the right multi-cluster Istio topology and planning your deployment based on your infrastructure, team, and reliability requirements.

---

Before you start running `istioctl install` across multiple clusters, you need to make some architectural decisions. The wrong topology choice can lead to unnecessary complexity, poor reliability, or performance bottlenecks that are painful to fix later.

This guide walks through the key decisions you need to make and how to evaluate each option based on your specific situation.

## Decision 1: How Many Control Planes?

Istio offers two main patterns:

**Multi-Primary**: Each cluster runs its own Istiod. Both control planes discover services from all clusters and push configuration to local proxies.

**Primary-Remote**: One cluster runs Istiod, and other clusters connect to it. Remote clusters do not run their own control plane.

Here is how to choose:

| Factor | Multi-Primary | Primary-Remote |
|--------|--------------|----------------|
| Control plane HA | Yes, each cluster is independent | No, single point of failure |
| Resource overhead | Higher (Istiod per cluster) | Lower (one Istiod total) |
| Operational complexity | Moderate | Lower |
| Upgrade complexity | Higher (coordinate across control planes) | Lower (upgrade one Istiod) |
| Latency to control plane | Low (local) | Depends on network distance |
| Configuration consistency | Must coordinate | Inherently consistent |

**General recommendation**: Use multi-primary if you need high availability for the control plane or if your clusters are in different regions. Use primary-remote if you have a main cluster and smaller satellite clusters.

## Decision 2: Same Network or Different Networks?

This is determined by your infrastructure, not by preference:

**Same network**: Pods in different clusters can reach each other by IP. This is the case when clusters share a VPC, are connected via VPC peering with full CIDR routing, or are on the same physical network.

**Different networks**: Pods cannot reach each other directly. This is typical for clusters in different cloud providers, different regions without VPC peering, or on-premises clusters behind NAT.

Check by deploying a test pod in each cluster and seeing if they can communicate by IP:

```bash
# Get a pod IP from cluster2
POD_IP=$(kubectl get pod -l app=test -n default --context="${CTX_CLUSTER2}" -o jsonpath='{.items[0].status.podIP}')

# Try to reach it from cluster1
kubectl exec -n default deployment/test --context="${CTX_CLUSTER1}" -- curl -sS --connect-timeout 5 ${POD_IP}:8080
```

If this works, you are on the same network. If it times out, you are on different networks and need east-west gateways.

Also check for overlapping pod CIDRs:

```bash
# Check pod CIDR in each cluster
kubectl cluster-info dump --context="${CTX_CLUSTER1}" | grep -m1 cluster-cidr
kubectl cluster-info dump --context="${CTX_CLUSTER2}" | grep -m1 cluster-cidr
```

If CIDRs overlap, you must use different-network mode even if the clusters can technically reach each other. Overlapping CIDRs on the same network causes routing ambiguity.

## Decision 3: Trust Domain

All clusters in a mesh should share the same trust domain. The trust domain is part of every workload identity (SPIFFE ID):

```text
spiffe://cluster.local/ns/default/sa/reviews
```

Use the default `cluster.local` or pick a custom domain:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: mesh.example.com
```

If you have clusters that need to join and leave the mesh dynamically, consider using a trust domain that is not tied to a specific cluster name.

## Decision 4: Certificate Authority Strategy

Options:

1. **Istio self-signed CA with shared root**: Generate a root CA offline, create per-cluster intermediate CAs. Simple, works for most cases.

2. **cert-manager integration**: Use cert-manager to manage intermediate CAs with automatic rotation. Better lifecycle management.

3. **Cloud provider CA**: Use AWS Private CA, Google CAS, or HashiCorp Vault. Best for enterprises with existing PKI.

For most teams getting started, option 1 is fine. Move to option 2 or 3 as you mature.

## Decision 5: Mesh Configuration Management

In multi-primary setups, you need to keep configuration consistent across clusters. A VirtualService in cluster1 should match the one in cluster2. Options:

**GitOps with Argo CD or Flux**: Store all Istio CRDs in a Git repo and deploy to all clusters. This is the most popular approach:

```yaml
# Argo CD ApplicationSet targeting all clusters
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: istio-config
spec:
  generators:
  - clusters: {}
  template:
    spec:
      project: istio
      source:
        repoURL: https://github.com/org/istio-config
        path: config
      destination:
        server: '{{server}}'
        namespace: istio-system
```

**Istio's built-in config distribution**: In primary-remote setups, the primary's configuration is automatically distributed. No extra tooling needed.

## Decision 6: Ingress Strategy

How does external traffic enter the mesh? Options:

1. **Per-cluster ingress**: Each cluster has its own ingress gateway. DNS or a global load balancer routes users to the nearest cluster.

2. **Single ingress with cross-cluster routing**: One cluster handles all external traffic and routes to other clusters as needed.

3. **Cloud load balancer with multi-cluster backends**: AWS ALB, GCP Global LB, or similar, with backends in multiple clusters.

For most multi-cluster deployments, option 1 with a global load balancer in front is the best approach:

```text
User -> Global LB (Route53/CloudFlare) -> Cluster1 Ingress Gateway
                                       -> Cluster2 Ingress Gateway
```

## Decision 7: Namespace Strategy

Istio merges services based on name and namespace. You need a consistent namespace strategy:

**Mirror namespaces**: Same namespaces in all clusters. A service in `default` namespace in cluster1 is the same logical service as one in `default` namespace in cluster2.

**Cluster-specific namespaces**: Each cluster has unique namespaces. Use this if clusters run completely different applications and you do not want any service merging.

**Hybrid**: Shared namespaces for shared services, cluster-specific namespaces for cluster-local services.

## Capacity Planning

Estimate the resource requirements for your multi-cluster mesh:

**Istiod**: Each Istiod needs to track services and endpoints from all clusters. Rough sizing:

| Endpoints | Istiod CPU | Istiod Memory |
|-----------|-----------|---------------|
| < 1,000 | 500m | 1Gi |
| 1,000 - 5,000 | 1 CPU | 2Gi |
| 5,000 - 10,000 | 2 CPU | 4Gi |
| > 10,000 | 4 CPU | 8Gi |

**East-West Gateway**: Each cross-cluster connection goes through this gateway. Size based on expected cross-cluster traffic volume.

**Sidecar proxies**: Each proxy holds configuration for all services it can reach. Use Sidecar resources to limit scope and reduce memory usage.

## Phased Rollout Plan

Do not try to deploy multi-cluster Istio all at once. A phased approach:

**Phase 1**: Set up Istio in one cluster. Get comfortable with the operations.

**Phase 2**: Add a second cluster in primary-remote mode. This is the simplest multi-cluster topology.

**Phase 3**: If needed, move to multi-primary for HA.

**Phase 4**: Add locality-aware routing and cross-cluster authorization policies.

**Phase 5**: Set up multi-cluster observability and alerting.

Each phase should include thorough testing and validation before moving on.

## Summary

Planning a multi-cluster Istio architecture comes down to a series of decisions about control plane topology, network connectivity, certificate management, configuration distribution, and ingress strategy. There is no single right answer - it depends on your infrastructure, team size, reliability requirements, and operational maturity. Start simple with primary-remote, validate the fundamentals, and add complexity only when you have a clear need for it.
