# How to Use the Calico BGPFilter Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, BGP, BGPFilter, Kubernetes, Networking, Production, Route Filtering, DevOps

Description: Practical BGPFilter patterns for production Kubernetes clusters including multi-tenant isolation, external peering controls, and route leak prevention.

---

## Introduction

In production Kubernetes environments, uncontrolled BGP route exchange creates serious risks. Route leaks can expose internal pod networks to external systems, and accepting arbitrary routes from upstream peers can override intended routing behavior. The BGPFilter resource addresses these problems by giving you explicit control over which routes enter and leave your cluster through each BGP peering session.

Real-world BGPFilter usage goes beyond simple allow and deny lists. Production clusters commonly need different filtering policies for different types of peers. Internal route reflectors might receive full routing tables while external upstream peers should only see service VIPs. Multi-tenant clusters may need to prevent one tenant's routes from leaking to another.

This guide presents tested BGPFilter configurations for production scenarios, complete with the BGPPeer references needed to make them operational.

## Prerequisites

- Production Kubernetes cluster with Calico CNI
- Active BGP peering with external routers or route reflectors
- `calicoctl` and `kubectl` with cluster-admin access
- Coordination with network team for external peer filter verification

## Pattern 1: External Peer Route Restriction

When peering with upstream routers, restrict exports to only service IPs and restrict imports to only known data center ranges:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPFilter
metadata:
  name: external-upstream-filter
spec:
  exportV4:
    - action: Accept
      matchOperator: In
      cidr: 10.96.0.0/12
    - action: Accept
      matchOperator: In
      cidr: 198.51.100.0/24
    - action: Reject
      matchOperator: In
      cidr: 0.0.0.0/0
  importV4:
    - action: Accept
      matchOperator: In
      cidr: 10.0.0.0/8
    - action: Accept
      matchOperator: In
      cidr: 172.16.0.0/12
    - action: Reject
      matchOperator: In
      cidr: 0.0.0.0/0
```

Attach to the external BGPPeer:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: upstream-router
spec:
  peerIP: 10.0.0.1
  asNumber: 64501
  filters:
    - external-upstream-filter
```

## Pattern 2: Route Reflector Internal Filter

Route reflectors within the cluster should exchange all pod and service routes freely but should not advertise infrastructure routes:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPFilter
metadata:
  name: route-reflector-filter
spec:
  exportV4:
    - action: Accept
      matchOperator: In
      cidr: 10.244.0.0/16
    - action: Accept
      matchOperator: In
      cidr: 10.96.0.0/12
    - action: Reject
      matchOperator: In
      cidr: 0.0.0.0/0
  importV4:
    - action: Accept
      matchOperator: In
      cidr: 10.244.0.0/16
    - action: Accept
      matchOperator: In
      cidr: 10.96.0.0/12
    - action: Reject
      matchOperator: In
      cidr: 0.0.0.0/0
```

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rr-peer
spec:
  peerSelector: route-reflector == 'true'
  nodeSelector: "!route-reflector == 'true'"
  filters:
    - route-reflector-filter
```

## Pattern 3: Multi-Cluster Route Exchange

When two clusters peer with each other, each cluster should only accept pod and service routes from the other:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPFilter
metadata:
  name: cluster-b-filter
spec:
  exportV4:
    - action: Accept
      matchOperator: In
      cidr: 10.244.0.0/16
    - action: Accept
      matchOperator: In
      cidr: 10.96.0.0/12
    - action: Reject
      matchOperator: In
      cidr: 0.0.0.0/0
  importV4:
    - action: Accept
      matchOperator: In
      cidr: 10.245.0.0/16
    - action: Accept
      matchOperator: In
      cidr: 10.100.0.0/16
    - action: Reject
      matchOperator: In
      cidr: 0.0.0.0/0
```

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: cluster-b-peer
spec:
  peerIP: 192.168.1.100
  asNumber: 64520
  filters:
    - cluster-b-filter
```

## Pattern 4: IPv6 Filtering

For dual-stack clusters, apply IPv6 filters alongside IPv4:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPFilter
metadata:
  name: dual-stack-filter
spec:
  exportV4:
    - action: Accept
      matchOperator: In
      cidr: 10.96.0.0/12
    - action: Reject
      matchOperator: In
      cidr: 0.0.0.0/0
  exportV6:
    - action: Accept
      matchOperator: In
      cidr: fd00:10:96::/112
    - action: Reject
      matchOperator: In
      cidr: ::/0
  importV4:
    - action: Accept
      matchOperator: In
      cidr: 10.0.0.0/8
    - action: Reject
      matchOperator: In
      cidr: 0.0.0.0/0
  importV6:
    - action: Accept
      matchOperator: In
      cidr: fd00::/8
    - action: Reject
      matchOperator: In
      cidr: ::/0
```

## Verification

Validate filters are active and functioning in production:

```bash
# List all filters
calicoctl get bgpfilter -o wide

# Check which peers use which filters
calicoctl get bgppeer -o yaml | grep -B 10 "filters"

# Verify BGP sessions are healthy
calicoctl node status

# Monitor route exchange in logs
kubectl logs -n calico-system -l k8s-app=calico-node --tail=100 | grep -i "filter\|route\|accept\|reject"
```

## Troubleshooting

Common issues with BGPFilter in production:

- Routes still leaking despite filter: Verify the filter is referenced in the correct BGPPeer. Filters not attached to a peer have no effect
- Legitimate routes being blocked: Check rule ordering. A broad Reject before a specific Accept will block the intended route
- Filter not applied after update: Restart calico-node pods if filter changes are not reflected: `kubectl rollout restart daemonset calico-node -n calico-system`
- IPv6 routes not filtered: Ensure you have `exportV6` and `importV6` rules. IPv4 rules do not affect IPv6 routing

## Conclusion

BGPFilter resources are essential for production Calico deployments where route exchange must be tightly controlled. By applying different filters to different peering sessions, you can implement security boundaries between your cluster and external networks, between clusters, and between internal routing tiers. Always test filters in a staging environment first and keep backup configurations ready for quick rollback.
