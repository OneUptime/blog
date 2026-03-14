# How to Roll Out Calico Policy Log Rules Safely in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Logging, Audit, Security

Description: A phased rollout strategy for Calico Policy Log Rules in Calico to prevent outages.

---

## Introduction

Calico Policy Log Rules in Calico provides fine-grained network security controls using the `projectcalico.org/v3` API. This guide covers how to roll out Policy Logging effectively.

Calico's extensible policy model supports Policy Logging through its `GlobalNetworkPolicy` and `NetworkPolicy` resources, giving you cluster-wide and namespace-scoped control over traffic that matches your Policy Logging criteria.

This guide provides practical techniques for roll out Policy Logging in your Kubernetes cluster, following security best practices and production-tested patterns.

## Prerequisites

- Kubernetes cluster with Calico v3.26+
- `calicoctl` and `kubectl` installed
- Basic understanding of Calico network policy concepts

## Phase 1: Audit Current State

```bash
calicoctl get networkpolicies --all-namespaces
kubectl get events --all-namespaces | grep -i network | tail -20
```

## Phase 2: Apply to Non-Production First

```bash
calicoctl apply -f policy-logging-policy-staging.yaml
sleep 300
kubectl get events -n staging | tail -10
```

## Phase 3: Monitor and Verify

```bash
kubectl exec -n staging test-pod -- curl -s http://staging-service:8080
echo "Staging test: $?"
```

## Phase 4: Roll Out to Production

```bash
for ns in production-a production-b production-c; do
  calicoctl apply -f policy-logging-policy.yaml -n $ns
  sleep 120
  kubectl get events -n $ns | tail -5
done
```

## Architecture

```mermaid
flowchart TD
    A[Source Pod] -->|Traffic| B{Calico Policy\nPolicy Logging}
    B -->|Allow Rule Matches| C[Destination Pod]
    B -->|No Match / Deny| D[BLOCKED]
    E[Policy Controller] -->|Updates| B
```

## Conclusion

Roll Out Policy Logging policies in Calico requires attention to policy ordering, selector accuracy, and bidirectional rule coverage. Follow the patterns in this guide to ensure your Policy Logging policies are correctly configured, tested, and monitored. Always validate in staging before applying to production, and maintain comprehensive logging for visibility into policy decisions.
