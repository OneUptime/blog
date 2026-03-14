# How to Use calicoctl apply with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, calicoctl

Description: Use calicoctl apply to create or update Calico resources declaratively, with practical examples for network policies, BGP configuration, and IP pools.

---

## Introduction

`calicoctl apply` is the primary command for declarative Calico resource management. Like `kubectl apply`, it creates resources that don't exist and updates existing ones based on the YAML definition. It's the preferred command for infrastructure-as-code workflows because it's idempotent — running it multiple times produces the same result. Understanding when to use `apply` versus `create`, `replace`, or `patch` is essential for safe Calico operations.

## Basic calicoctl apply Usage

```bash
# Apply a single resource file
calicoctl apply -f globalnetworkpolicy.yaml

# Apply multiple files in a directory
calicoctl apply -f ./calico-policies/

# Apply from stdin
cat policy.yaml | calicoctl apply -f -

# Dry-run to preview changes (validate without applying)
calicoctl apply -f policy.yaml --dry-run
```

## Practical Example 1: Apply a GlobalNetworkPolicy

```yaml
# default-deny-policy.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny
spec:
  selector: all()
  types:
    - Ingress
    - Egress
  # No ingress or egress rules = deny all
```

```bash
calicoctl apply -f default-deny-policy.yaml
# Verify
calicoctl get globalnetworkpolicy default-deny -o yaml
```

## Practical Example 2: Apply BGPPeer Configuration

```yaml
# bgppeer-tor.yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: tor-switch-1
spec:
  peerIP: 192.168.1.1
  asNumber: 65001
  keepOriginalNextHop: true
```

```bash
calicoctl apply -f bgppeer-tor.yaml
# Verify BGP peer is established
calicoctl node status
```

## Practical Example 3: Apply IPPool

```bash
calicoctl apply -f - << 'YAML'
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: production-pool
spec:
  cidr: 10.100.0.0/16
  ipipMode: Always
  natOutgoing: true
  nodeSelector: "environment == 'production'"
YAML
```

## calicoctl apply Architecture

```mermaid
flowchart LR
    A[YAML file] -->|calicoctl apply| B[calicoctl client]
    B -->|Kubernetes API| C[Calico CRD storage]
    C -->|watch| D[Tigera Operator]
    D -->|reconcile| E[calico-node / Felix]
    E -->|iptables/eBPF| F[Data plane enforcement]
```

## Key Differences: apply vs Other Commands

```bash
# apply: creates or updates (idempotent)
calicoctl apply -f policy.yaml      # Safe to run multiple times

# create: fails if resource exists
calicoctl create -f policy.yaml     # Error if already exists

# replace: fails if resource doesn't exist
calicoctl replace -f policy.yaml    # Error if doesn't exist

# patch: partial update using JSON patch
calicoctl patch felixconfiguration default \
  -p '{"spec":{"logSeverityScreen":"Debug"}}'
```

## Conclusion

`calicoctl apply` is the safest command for declarative Calico resource management because it handles both create and update idempotently. Use it in GitOps pipelines, CI/CD, and all infrastructure-as-code workflows. Always use `--dry-run` first when applying policies to production clusters to preview the change before it takes effect. Store all policy YAML files in version control so every `calicoctl apply` operation is tracked and reversible.
