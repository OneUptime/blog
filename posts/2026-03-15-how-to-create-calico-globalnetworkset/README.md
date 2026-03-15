# How to Create the Calico GlobalNetworkSet Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, GlobalNetworkSet, Kubernetes, Network Security, IP Management

Description: Create Calico GlobalNetworkSet resources to define reusable sets of IP addresses and CIDRs for use in network policies.

---

## Introduction

A Calico GlobalNetworkSet is a cluster-scoped resource that holds a collection of IP addresses, CIDRs, or domain names. You reference these sets from GlobalNetworkPolicy rules instead of hardcoding IP addresses directly into policies. This separation makes policy management cleaner and updates simpler.

GlobalNetworkSets are particularly useful for managing lists of trusted external services, blocked IP ranges, or partner network addresses. When an IP list changes, you update the GlobalNetworkSet once rather than editing every policy that references it.

This guide covers creating GlobalNetworkSet resources for common use cases, including threat intelligence feeds, partner allowlists, and internal service registries.

## Prerequisites

- A Kubernetes cluster with Calico installed (v3.20+)
- `calicoctl` installed and configured
- `kubectl` access with cluster-admin privileges

## Creating a Basic GlobalNetworkSet

Define a set of trusted external CIDRs that your workloads need to reach:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkSet
metadata:
  name: trusted-partners
  labels:
    role: trusted-external
spec:
  nets:
    - 203.0.113.0/24
    - 198.51.100.0/24
    - 192.0.2.50/32
```

Apply it:

```bash
calicoctl apply -f trusted-partners.yaml
```

## Creating a Deny List for Threat Intelligence

Block known malicious IP ranges by defining them in a GlobalNetworkSet:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkSet
metadata:
  name: threat-intel-blocklist
  labels:
    role: threat-feed
spec:
  nets:
    - 10.200.0.0/16
    - 172.30.50.0/24
    - 192.168.100.0/24
    - 198.18.0.0/15
```

```bash
calicoctl apply -f threat-intel-blocklist.yaml
```

## Referencing GlobalNetworkSet in a Policy

Use the label selector in a GlobalNetworkPolicy to reference the network set:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: block-threat-ips
spec:
  order: 10
  selector: all()
  types:
    - Egress
  egress:
    - action: Deny
      destination:
        selector: role == 'threat-feed'
```

```bash
calicoctl apply -f block-threat-ips.yaml
```

The policy matches any destination that carries the label `role == 'threat-feed'`, which resolves to the IPs in the `threat-intel-blocklist` GlobalNetworkSet.

## Creating a GlobalNetworkSet for Internal Services

Define CIDRs for internal services that should be reachable from specific workloads:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkSet
metadata:
  name: internal-monitoring
  labels:
    role: monitoring-targets
spec:
  nets:
    - 10.0.50.0/24
    - 10.0.51.0/24
```

```bash
calicoctl apply -f internal-monitoring.yaml
```

## Verification

List all GlobalNetworkSet resources:

```bash
calicoctl get globalnetworkset -o wide
```

Inspect a specific resource:

```bash
calicoctl get globalnetworkset trusted-partners -o yaml
```

Verify the labels are correctly set:

```bash
calicoctl get globalnetworkset -o yaml | grep -A3 "labels:"
```

Confirm the policy correctly references the network set by testing connectivity:

```bash
kubectl run test-pod --image=busybox --rm -it --restart=Never -- wget -qO- --timeout=3 http://203.0.113.10/
```

## Troubleshooting

If policies are not matching the GlobalNetworkSet, confirm the label selectors align. The label on the GlobalNetworkSet must exactly match the selector in the policy.

Check that the GlobalNetworkSet exists:

```bash
calicoctl get globalnetworkset threat-intel-blocklist -o yaml
```

Verify the nets field contains valid CIDR notation. Single hosts must use /32 suffix:

```bash
calicoctl get globalnetworkset -o yaml | grep -A10 "nets:"
```

If Felix is not applying the rules, restart the calico-node pods:

```bash
kubectl rollout restart daemonset calico-node -n calico-system
```

## Conclusion

Calico GlobalNetworkSet resources decouple IP address management from policy definitions. By labeling network sets and referencing them via selectors in GlobalNetworkPolicy rules, you can update IP lists independently of your security policies. This approach scales well for threat feeds, partner allowlists, and internal service registries.
