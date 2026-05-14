# How to Map Network Policy Fundamentals in Calico to Real Kubernetes Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, CNI, Traffic Flows, Networking, Security

Description: Apply Calico network policy concepts to real Kubernetes traffic scenarios, tracing how policies are matched and evaluated for actual inter-pod and external traffic.

---

## Introduction

Network policy concepts become meaningful when applied to real traffic. Understanding how Felix evaluates policies for a specific packet - which policies match, in what order, and what decision results - is the foundation for both debugging connectivity issues and writing correct policies.

This post maps four real traffic scenarios to their policy evaluation paths, showing which policies apply, how selectors match, and what the final allow/deny decision looks like.

## Prerequisites

- A Calico cluster with multiple NetworkPolicies applied
- `kubectl` and `calicoctl` access
- Understanding of Calico policy selectors and evaluation order

## How Felix Evaluates Policies

Felix evaluates Calico policies by tier. Tiers are sorted by `order` from lowest number to highest priority, and policies inside each tier are then processed in order. Kubernetes NetworkPolicy objects are enforced in the default tier with Calico policies that have no explicit tier.

```mermaid
graph TD
    Packet[Packet arrives at\ndestination pod] --> Tiers[Tiers sorted by order]
    Tiers --> Policies[Calico GlobalNetworkPolicy,\nCalico NetworkPolicy,\nand Kubernetes NetworkPolicy]
    Policies --> Rules[Rules processed top-to-bottom]
    Rules --> Result{Final decision}
    Result -->|Allow matched| ALLOW[Allow]
    Result -->|Deny matched| DENY[Deny]
    Result -->|Tier applies but no rule matches| IMPL[Implicit deny]
    Result -->|No policy selects pod| OPEN[Allow all]
```

## Scenario 1: Microservice-to-Microservice (Standard Case)

A payment service pod communicates with a database pod. The database has a deny-all ingress policy with an explicit allow for the payment service.

**Active policies on the database pod**:
1. GlobalNetworkPolicy `security-baseline`: no matching deny rule for the payment service source
2. Calico NetworkPolicy `allow-payment-service`: Allow from `app=payment-service`
3. Calico NetworkPolicy `deny-all`: Deny (catch-all)

**Evaluation for traffic from payment service**:
```plaintext
1. security-baseline: evaluates source selector - no matching rule, so evaluation continues within the tier
2. allow-payment-service: source app=payment-service matches → Allow
3. Evaluation stops for Calico policy because Allow and Deny actions are final
```

```bash
# Verify which Calico policies apply to the database pod

kubectl get pod db-pod -o jsonpath='{.metadata.labels}'
# Use labels to find matching policies:
calicoctl get networkpolicy -n database -o yaml | grep selector
```

## Scenario 2: Cross-Namespace Communication

An analytics pod in the `analytics` namespace tries to query the database in the `data` namespace. The database has a GlobalNetworkPolicy that allows only specific namespaces.

**Policy evaluation**:
```yaml
# GlobalNetworkPolicy applied:
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: database-access
spec:
  namespaceSelector: projectcalico.org/name == 'data'
  selector: app == 'database'
  ingress:
  - action: Allow
    source:
      namespaceSelector: role == 'data-consumer'
  - action: Deny
```

If the `analytics` namespace has label `role: data-consumer`, the analytics pod is allowed. If not, it is denied by the explicit Deny rule.

```bash
# Check namespace labels
kubectl get namespace analytics --show-labels
# Add label if needed:
kubectl label namespace analytics role=data-consumer
```

## Scenario 3: External Traffic Through an Ingress Controller

External HTTP traffic arrives at the NGINX ingress controller and is proxied to a backend pod. The backend has a deny-all ingress policy. What allows the NGINX traffic?

The backend's NetworkPolicy must explicitly allow traffic from the ingress controller pod:

```yaml
ingress:
- from:
  - namespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: ingress-nginx
    podSelector:
      matchLabels:
        app.kubernetes.io/name: ingress-nginx
  ports:
  - port: 8080
```

Felix evaluates this when the packet arrives from the NGINX pod IP. The NGINX pod's labels and namespace labels must match the `from` selectors for the allow to trigger.

```bash
# Verify NGINX pod labels match the selector
kubectl get pod -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --show-labels
```

## Scenario 4: GlobalNetworkPolicy Blocking Known Bad CIDRs

A GlobalNetworkPolicy blocks traffic from an example CIDR that represents a blocklist entry:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: block-bad-cidr
spec:
  tier: security
  order: 50  # Evaluated before later policies in the security tier
  selector: all()
  ingress:
  - action: Deny
    source:
      nets:
      - 198.51.100.0/24
  - action: Pass
```

Assuming the `security` tier is ordered before the application/default tiers, any packet from `198.51.100.0/24` to any pod in the cluster is denied before any application-level policy can allow it. The `Pass` action for non-matching traffic skips the rest of the current tier and continues with the next tier that contains a policy applying to the endpoint.

## Tracing Policy Evaluation with Felix Logs

Add a Calico `Log` action before the rule you want to observe, then watch node logs for matching packets:

```bash
# On a specific node
sudo journalctl -f | grep -i "calico-packet"

# Or view the calico/node logs for Felix output
kubectl logs -n calico-system <calico-node-pod-name>
```

## Best Practices

- Use tiers and the GlobalNetworkPolicy ordering field deliberately: security baselines in an earlier tier, then compliance and app policies in later tiers
- Test policy evaluation by tracing a specific pod pair: which policies select each pod, and do their rules match?
- Use `calicoctl get workloadendpoint -n <namespace> -o yaml` to inspect the workload endpoint labels and profiles Calico uses for policy matching

## Conclusion

Policy evaluation in Calico follows a deterministic path: tiers by order, then policies within each tier, with Kubernetes NetworkPolicy enforced in the default tier. For each packet, Felix finds the policies that select the relevant endpoint, evaluates their rules top-to-bottom, and applies final Calico actions such as Allow or Deny when they match. Tracing this path for a specific traffic scenario is the most reliable debugging approach for any connectivity issue.
