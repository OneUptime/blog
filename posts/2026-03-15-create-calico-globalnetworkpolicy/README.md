# How to Create the Calico GlobalNetworkPolicy Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, GlobalNetworkPolicy, Kubernetes, Security, Network Policy, Zero Trust

Description: Learn how to create Calico GlobalNetworkPolicy resources to enforce cluster-wide network security rules across all namespaces.

---

## Introduction

Calico GlobalNetworkPolicy resources enforce network security rules across all namespaces in your Kubernetes cluster. Unlike standard Kubernetes NetworkPolicy resources which are namespace-scoped, GlobalNetworkPolicy applies to the entire cluster, making it ideal for baseline security rules, compliance requirements, and default deny policies.

GlobalNetworkPolicy supports Calico-specific features like application layer policy, DNS-based rules, and host endpoint protection that are not available in the standard Kubernetes NetworkPolicy API. These capabilities make it the preferred choice for implementing zero-trust networking and microsegmentation at scale.

This guide covers creating GlobalNetworkPolicy resources for common security patterns, from default deny policies to granular egress controls and host endpoint protection.

## Prerequisites

- A Kubernetes cluster with Calico CNI installed
- `calicoctl` installed and configured
- `kubectl` with cluster-admin privileges
- Understanding of Kubernetes networking and pod selectors

## Creating a Default Deny Policy

The foundation of zero-trust networking is a default deny policy that blocks all traffic unless explicitly allowed:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny-all
spec:
  order: 1000
  selector: all()
  types:
    - Ingress
    - Egress
```

Apply the policy:

```bash
calicoctl apply -f default-deny.yaml
```

This blocks all pod-to-pod traffic. You must create allow policies with a lower order number to permit required traffic.

## Allowing DNS Traffic Cluster-Wide

After applying default deny, pods need DNS resolution. Create a policy to allow DNS:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-dns
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
calicoctl apply -f allow-dns.yaml
```

## Allowing Kubernetes API Access

Pods often need to communicate with the Kubernetes API server:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-kube-api
spec:
  order: 100
  selector: all()
  types:
    - Egress
  egress:
    - action: Allow
      protocol: TCP
      destination:
        nets:
          - 10.96.0.1/32
        ports:
          - 443
          - 6443
```

```bash
calicoctl apply -f allow-kube-api.yaml
```

## Creating a Namespace Isolation Policy

Restrict traffic so pods can only communicate within their own namespace:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: namespace-isolation
spec:
  order: 200
  namespaceSelector: has(kubernetes.io/metadata.name)
  types:
    - Ingress
  ingress:
    - action: Allow
      source:
        namespaceSelector: "kubernetes.io/metadata.name == '{{.Namespace}}'"
```

## Blocking Egress to External Networks

Prevent pods from reaching the public internet while allowing internal cluster traffic:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: deny-external-egress
spec:
  order: 500
  selector: "role != 'internet-access'"
  types:
    - Egress
  egress:
    - action: Allow
      destination:
        nets:
          - 10.0.0.0/8
          - 172.16.0.0/12
          - 192.168.0.0/16
    - action: Deny
```

Pods that need external access can be labeled to bypass this policy:

```bash
kubectl label pod my-app role=internet-access
```

## Protecting System Namespaces

Create a policy to restrict access to the kube-system namespace:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: protect-kube-system
spec:
  order: 50
  namespaceSelector: "kubernetes.io/metadata.name == 'kube-system'"
  types:
    - Ingress
  ingress:
    - action: Allow
      source:
        namespaceSelector: "kubernetes.io/metadata.name == 'kube-system'"
    - action: Allow
      protocol: TCP
      destination:
        ports:
          - 53
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
    - action: Deny
```

```bash
calicoctl apply -f protect-kube-system.yaml
```

## Verification

List all GlobalNetworkPolicy resources and their order:

```bash
calicoctl get globalnetworkpolicy -o wide
```

Test that the default deny policy is working:

```bash
kubectl run test-pod --image=busybox --restart=Never -- wget -qO- --timeout=5 http://example.com
kubectl logs test-pod
kubectl delete pod test-pod
```

Verify DNS still works:

```bash
kubectl run dns-test --image=busybox --restart=Never -- nslookup kubernetes.default.svc
kubectl logs dns-test
kubectl delete pod dns-test
```

## Troubleshooting

If legitimate traffic is blocked after applying policies, check the policy order to ensure allow rules have a lower number than deny rules:

```bash
calicoctl get globalnetworkpolicy -o yaml | grep -E "name:|order:"
```

To see which policy is blocking traffic, enable Felix debug logging temporarily:

```bash
calicoctl patch felixconfiguration default -p '{"spec":{"logSeverityScreen":"Debug"}}'
kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node --tail=50 | grep -i "deny\|drop"
calicoctl patch felixconfiguration default -p '{"spec":{"logSeverityScreen":"Info"}}'
```

If the policy selector is not matching the intended pods, verify labels:

```bash
kubectl get pods --all-namespaces --show-labels
```

## Conclusion

Calico GlobalNetworkPolicy resources provide powerful cluster-wide network security enforcement. Starting with a default deny policy and layering specific allow rules creates a zero-trust network architecture. Use the order field to control policy precedence, and always verify that critical services like DNS and the Kubernetes API remain accessible after applying new policies.
