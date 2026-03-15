# How to Use the Calico StagedGlobalNetworkPolicy Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, StagedGlobalNetworkPolicy, Kubernetes, Network Security, Production, DevOps

Description: Practical patterns for using Calico StagedGlobalNetworkPolicy in production clusters with staged rollouts and traffic impact analysis.

---

## Introduction

In production Kubernetes environments, applying global network policies without testing can cause outages. The StagedGlobalNetworkPolicy resource in Calico Enterprise solves this by letting you stage policy changes and evaluate their impact before enforcement. This is critical for clusters running hundreds of microservices where a misconfigured deny rule could break cross-service communication.

Real-world usage of StagedGlobalNetworkPolicy goes beyond simple policy creation. Teams use it to implement change management workflows, integrate with CI/CD pipelines for policy-as-code, and perform traffic impact analysis using flow logs. Understanding these patterns is essential for operating Calico at scale.

This guide covers practical use cases for StagedGlobalNetworkPolicy in production clusters, including staged rollout workflows, multi-team review processes, and automated validation.

## Prerequisites

- Kubernetes production cluster with Calico Enterprise
- `calicoctl` CLI configured
- Calico Enterprise Manager UI access
- Flow logs enabled for traffic impact analysis
- `kubectl` with appropriate RBAC permissions

## Staging a Default-Deny Policy

One of the most common production scenarios is rolling out a default-deny policy. Applying this directly would break all workloads without explicit allow rules. Stage it first:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedGlobalNetworkPolicy
metadata:
  name: default-deny-all
spec:
  stagedAction: Set
  order: 1000
  selector: all()
  types:
    - Ingress
    - Egress
  ingress:
    - action: Deny
  egress:
    - action: Deny
```

```bash
calicoctl apply -f default-deny-staged.yaml
```

After staging, review the flow logs in Calico Enterprise Manager to see which active connections would be denied by this policy. This impact preview prevents blind enforcement.

## Multi-Namespace Egress Control

In real clusters, you often need to restrict egress across all namespaces while allowing specific external services. Stage this policy to validate before enforcement:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedGlobalNetworkPolicy
metadata:
  name: restrict-external-egress
spec:
  stagedAction: Set
  order: 200
  selector: all()
  types:
    - Egress
  egress:
    - action: Allow
      protocol: TCP
      destination:
        nets:
          - 10.0.0.0/8
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
    - action: Deny
```

This allows all cluster-internal traffic and DNS, while denying external access. The staged mode lets you discover workloads that depend on external APIs before the deny takes effect.

## Integrating with CI/CD Pipelines

Automate staged policy deployment in your CI/CD pipeline:

```bash
#!/bin/bash
POLICY_FILE=$1

calicoctl apply -f "$POLICY_FILE"

POLICY_NAME=$(grep "name:" "$POLICY_FILE" | head -1 | awk '{print $2}')
STATUS=$(calicoctl get stagedglobalnetworkpolicy "$POLICY_NAME" -o yaml | grep stagedAction)

echo "Staged policy applied: $POLICY_NAME"
echo "Status: $STATUS"
echo "Review in Calico Enterprise Manager before committing."
```

## Verification

Confirm staged policies are visible and not yet enforced:

```bash
calicoctl get stagedglobalnetworkpolicies -o wide
```

Verify that existing traffic flows are unaffected while the policy is staged:

```bash
kubectl exec -it test-pod -- curl -s -o /dev/null -w "%{http_code}" http://external-service.example.com
```

Review the staged policy impact in the Calico Enterprise Manager dashboard to see matched flows.

## Troubleshooting

If staged policies do not appear in the Manager UI, confirm Calico Enterprise components are running:

```bash
kubectl get pods -n calico-system
```

If flow log analysis shows no matched flows, verify that flow logging is enabled in the FelixConfiguration:

```bash
calicoctl get felixconfiguration default -o yaml | grep flowLogs
```

If a staged policy was accidentally committed, create a new StagedGlobalNetworkPolicy with `stagedAction: Delete` referencing the committed policy name to stage its removal.

## Conclusion

StagedGlobalNetworkPolicy is essential for safe network policy management in production Calico clusters. By staging changes first, reviewing traffic impact through flow logs, and integrating with CI/CD pipelines, teams can enforce zero-trust networking without risking outages. Always stage global policies before committing them in environments where uptime is critical.
