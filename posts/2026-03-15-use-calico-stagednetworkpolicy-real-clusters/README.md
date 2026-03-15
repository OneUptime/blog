# How to Use the Calico StagedNetworkPolicy Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, StagedNetworkPolicy, Kubernetes, Production, Network Security, Zero Trust

Description: Production patterns for using Calico StagedNetworkPolicy to implement zero-trust networking with staged rollouts and traffic analysis.

---

## Introduction

Implementing network segmentation in production Kubernetes clusters is a high-stakes operation. StagedNetworkPolicy in Calico Enterprise provides namespace-scoped policy staging with the full power of Calico's native policy language. This includes ordered rule evaluation, action types beyond simple allow and deny, and advanced selectors that go beyond what Kubernetes NetworkPolicy supports.

In real clusters, StagedNetworkPolicy is used to incrementally adopt zero-trust networking within namespaces, validate compliance policies before enforcement, and coordinate policy changes across multiple teams. The staging workflow integrates with existing change management processes, providing a preview of traffic impact before any rules are enforced.

This guide demonstrates practical patterns for using StagedNetworkPolicy in production, including incremental zero-trust adoption, compliance-driven policies, and cross-team coordination.

## Prerequisites

- Production Kubernetes cluster with Calico Enterprise
- `calicoctl` CLI configured with cluster access
- Calico Enterprise Manager with flow log visualization
- Namespace-level RBAC for staged policy management
- Monitoring and alerting for network policy events

## Incremental Zero-Trust Adoption

Start by staging a log-only policy to discover existing traffic patterns in a namespace:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedNetworkPolicy
metadata:
  name: audit-all-traffic
  namespace: checkout
spec:
  order: 9999
  selector: all()
  types:
    - Ingress
    - Egress
  ingress:
    - action: Log
  egress:
    - action: Log
```

```bash
calicoctl apply -f audit-all-traffic.yaml
```

After reviewing flow logs in Calico Enterprise Manager, create targeted allow rules based on observed traffic:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedNetworkPolicy
metadata:
  name: checkout-allow-known
  namespace: checkout
spec:
  order: 100
  selector: app == 'checkout-service'
  types:
    - Ingress
    - Egress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: app == 'api-gateway'
      destination:
        ports:
          - 8080
  egress:
    - action: Allow
      protocol: TCP
      destination:
        selector: app == 'payment-service'
        ports:
          - 443
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
```

## Compliance-Driven Policy Staging

Stage policies that enforce compliance requirements such as PCI DSS network segmentation:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedNetworkPolicy
metadata:
  name: pci-segment-cardholder
  namespace: payments
  labels:
    compliance: pci-dss
    requirement: "1.3"
spec:
  order: 10
  selector: pci-zone == 'cardholder-data'
  types:
    - Ingress
    - Egress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: pci-zone == 'dmz'
      destination:
        ports:
          - 443
    - action: Deny
  egress:
    - action: Allow
      protocol: TCP
      destination:
        selector: pci-zone == 'cardholder-data'
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
    - action: Deny
```

Query compliance-related staged policies across namespaces:

```bash
kubectl get stagednetworkpolicies --all-namespaces -l compliance=pci-dss
```

## Cross-Team Policy Coordination

Use annotations to track policy ownership and approval status in multi-team environments:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedNetworkPolicy
metadata:
  name: backend-isolation
  namespace: backend
  annotations:
    owner: platform-team
    approved-by: ""
    jira-ticket: NET-4521
spec:
  order: 100
  selector: tier == 'backend'
  types:
    - Ingress
  ingress:
    - action: Allow
      source:
        selector: tier == 'middleware'
      destination:
        ports:
          - 8080
          - 8443
    - action: Deny
```

## Verification

List all staged policies with their labels:

```bash
calicoctl get stagednetworkpolicies --all-namespaces -o wide
```

Verify traffic flow is unaffected while policies remain staged:

```bash
kubectl exec -n checkout deploy/checkout-service -- curl -s -o /dev/null -w "%{http_code}" http://payment-service:443
```

Check flow logs for traffic matching staged rules:

```bash
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50 | grep "staged"
```

## Troubleshooting

If staged policies do not show matched flows, verify that flow log reporting is configured in Felix:

```bash
calicoctl get felixconfiguration default -o yaml | grep -i flow
```

If multiple staged policies conflict within a namespace, check the order values. Lower order values take precedence:

```bash
calicoctl get stagednetworkpolicies -n checkout -o yaml | grep -B 2 "order:"
```

If a committed policy causes traffic disruption, immediately delete the enforced policy:

```bash
calicoctl delete networkpolicy checkout-allow-known -n checkout
```

## Conclusion

StagedNetworkPolicy is essential for production network policy management in Calico Enterprise. By combining staged rollouts with flow log analysis, teams can adopt zero-trust networking incrementally, enforce compliance requirements with confidence, and coordinate policy changes across organizational boundaries. The key is to always stage first, review the traffic impact, and commit only after validation.
