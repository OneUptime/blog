# How to Create the Calico BGPFilter Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, BGP, BGPFilter, Kubernetes, Networking, Route Filtering, DevOps

Description: Learn how to create the Calico BGPFilter resource to control which BGP routes are imported and exported by your Kubernetes cluster nodes.

---

## Introduction

The BGPFilter resource in Calico allows you to control BGP route advertisement at a granular level. While the BGPConfiguration resource defines what CIDRs are available for advertisement, BGPFilter lets you define rules that accept or reject specific routes based on CIDR matching. This is essential for preventing route leaks and limiting which prefixes are exchanged between peers.

BGPFilter resources are referenced by BGPPeer resources, meaning you can apply different filters to different peering sessions. For example, you might allow all internal routes to be shared with route reflectors while restricting which routes are advertised to external upstream peers.

This guide walks through creating BGPFilter resources for common filtering scenarios, using the proper `projectcalico.org/v3` API fields.

## Prerequisites

- Kubernetes cluster with Calico CNI installed
- `calicoctl` and `kubectl` with cluster-admin access
- Existing BGPConfiguration and BGPPeer resources configured
- Understanding of CIDR notation and BGP route filtering concepts

## Understanding the BGPFilter Schema

The BGPFilter resource defines import and export rules that match on CIDR prefixes. Each rule specifies an action (Accept or Reject) and a match criteria:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPFilter
metadata:
  name: my-filter
spec:
  exportV4:
    - action: Accept
      matchOperator: In
      cidr: 10.96.0.0/12
    - action: Reject
      matchOperator: In
      cidr: 0.0.0.0/0
  importV4:
    - action: Accept
      matchOperator: In
      cidr: 10.0.0.0/8
    - action: Reject
      matchOperator: In
      cidr: 0.0.0.0/0
```

The `matchOperator` field supports `In`, `NotIn`, and `Equal`. Rules are evaluated in order, and the first matching rule determines the action.

## Creating an Export Filter

To control which routes your nodes advertise to external peers, create an export filter:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPFilter
metadata:
  name: export-filter-external
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
```

Apply the filter:

```bash
calicoctl apply -f export-filter.yaml
```

This filter allows only service cluster IPs and a specific external range to be advertised, rejecting everything else.

## Creating an Import Filter

To control which routes your nodes accept from external peers:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPFilter
metadata:
  name: import-filter-upstream
spec:
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

```bash
calicoctl apply -f import-filter.yaml
```

## Creating a Combined Import and Export Filter

Most production scenarios require filtering in both directions:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPFilter
metadata:
  name: datacenter-filter
spec:
  exportV4:
    - action: Accept
      matchOperator: In
      cidr: 10.96.0.0/12
    - action: Accept
      matchOperator: In
      cidr: 10.244.0.0/16
    - action: Reject
      matchOperator: In
      cidr: 0.0.0.0/0
  importV4:
    - action: Accept
      matchOperator: In
      cidr: 10.0.0.0/8
    - action: Accept
      matchOperator: In
      cidr: 192.168.0.0/16
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
  importV6:
    - action: Accept
      matchOperator: In
      cidr: fd00::/8
    - action: Reject
      matchOperator: In
      cidr: ::/0
```

## Attaching Filters to BGPPeers

Filters take effect only when referenced by a BGPPeer resource using the `filters` field:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: upstream-peer
spec:
  peerIP: 10.0.0.1
  asNumber: 64501
  filters:
    - datacenter-filter
```

```bash
calicoctl apply -f bgppeer-with-filter.yaml
```

## Verification

Verify the filter was created and is correctly referenced:

```bash
calicoctl get bgpfilter -o wide

calicoctl get bgpfilter datacenter-filter -o yaml

calicoctl get bgppeer upstream-peer -o yaml
```

Check calico-node logs to confirm filters are applied:

```bash
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50 | grep -i filter
```

## Troubleshooting

If routes are not being filtered as expected:

- Verify the filter is referenced in the BGPPeer `filters` field. A standalone BGPFilter has no effect
- Check rule ordering. Rules are evaluated top-to-bottom and the first match wins
- Ensure CIDR ranges are correct. A `/0` catch-all reject must be the last rule
- Confirm the matchOperator is appropriate: `In` matches any prefix within the CIDR, `Equal` requires exact match
- Review calico-node logs: `kubectl logs -n calico-system -l k8s-app=calico-node | grep -i "bgp\|filter\|route"`

## Conclusion

The BGPFilter resource gives you precise control over BGP route exchange in Calico. By defining import and export rules with CIDR matching, you prevent route leaks and ensure only intended prefixes are shared between peers. Always attach filters to BGPPeer resources and test with non-disruptive rules before adding broad reject rules. Order your rules carefully, placing specific allows before catch-all rejects.
