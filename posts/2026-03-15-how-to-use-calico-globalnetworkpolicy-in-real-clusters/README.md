# How to Use the Calico GlobalNetworkPolicy Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, GlobalNetworkPolicy, Kubernetes, Network Security, Zero Trust

Description: Deploy and manage Calico GlobalNetworkPolicy resources to enforce cluster-wide network security rules across all namespaces.

---

## Introduction

Calico GlobalNetworkPolicy is a cluster-scoped resource that applies network rules across all namespaces without requiring per-namespace duplication. Unlike the namespace-scoped NetworkPolicy, a GlobalNetworkPolicy lets you define baseline security controls that every workload in the cluster must follow.

In production environments, GlobalNetworkPolicy is commonly used to implement default-deny postures, block access to metadata endpoints, and enforce egress controls. These policies evaluate before Kubernetes NetworkPolicy resources unless you explicitly set their order field.

This guide walks through practical GlobalNetworkPolicy configurations that address real security requirements in production Calico clusters.

## Prerequisites

- A Kubernetes cluster with Calico installed (v3.20+)
- `calicoctl` installed and configured
- `kubectl` access with cluster-admin privileges
- Familiarity with Calico selector syntax

## Implementing a Default-Deny Ingress Policy

A default-deny policy blocks all ingress traffic unless explicitly allowed by a higher-priority policy. This is the foundation of a zero-trust network model.

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  order: 1000
  selector: all()
  types:
    - Ingress
  ingress:
    - action: Deny
```

Apply the policy:

```bash
calicoctl apply -f default-deny-ingress.yaml
```

## Allowing DNS Egress Cluster-Wide

After implementing default-deny, workloads lose DNS resolution. This policy restores DNS access for all pods:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-dns-egress
spec:
  order: 100
  selector: all()
  types:
    - Egress
  egress:
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
    - action: Allow
      protocol: TCP
      destination:
        ports:
          - 53
```

```bash
calicoctl apply -f allow-dns-egress.yaml
```

## Blocking Cloud Metadata Access

Prevent pods from reaching the cloud provider metadata service, which is a common attack vector for credential theft:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: deny-metadata-access
spec:
  order: 50
  selector: all()
  types:
    - Egress
  egress:
    - action: Deny
      destination:
        nets:
          - 169.254.169.254/32
```

```bash
calicoctl apply -f deny-metadata-access.yaml
```

## Allowing Ingress for Labeled Workloads

Grant ingress access only to workloads with a specific label, while the default-deny remains in effect for everything else:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-web-ingress
spec:
  order: 200
  selector: role == 'web-frontend'
  types:
    - Ingress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: role == 'load-balancer'
      destination:
        ports:
          - 80
          - 443
```

```bash
calicoctl apply -f allow-web-ingress.yaml
```

## Verification

Check that policies are applied and active:

```bash
calicoctl get globalnetworkpolicy -o wide
```

Verify policy ordering:

```bash
calicoctl get globalnetworkpolicy -o yaml | grep -A2 "name:"
```

Test connectivity from a pod to confirm the deny rules work:

```bash
kubectl run test-pod --image=busybox --rm -it --restart=Never -- wget -qO- --timeout=3 http://169.254.169.254/latest/meta-data/
```

The request should time out, confirming the metadata deny policy is active.

## Troubleshooting

If traffic is unexpectedly blocked, check the policy order values. Lower order numbers evaluate first. A deny at order 50 takes precedence over an allow at order 200 only if the deny matches first.

List all policies and their orders:

```bash
calicoctl get globalnetworkpolicy -o yaml | grep -E "name:|order:"
```

Check the Calico Felix logs for denied packets:

```bash
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50 | grep -i denied
```

If DNS stops working after applying default-deny, make sure the allow-dns-egress policy has a lower order number than the deny-all policy.

## Conclusion

Calico GlobalNetworkPolicy provides cluster-wide security enforcement without namespace-scoped duplication. Start with a default-deny baseline, then layer allow rules with explicit order values. Always test policies in a staging environment before rolling them out to production, and use the order field carefully to avoid unintended rule conflicts.
