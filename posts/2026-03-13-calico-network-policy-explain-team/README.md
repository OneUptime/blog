# How to Explain Network Policy Fundamentals in Calico to Your Team

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, CNI, Team Communication, Security, Zero Trust

Description: A practical guide for teaching Calico network policy concepts to engineering teams, using analogies and live demonstrations to make policy evaluation intuitive.

---

## Introduction

Network policy is the mechanism Kubernetes uses to move toward zero-trust networking - where selected workloads only accept the communication that policy explicitly allows. Explaining this to developers who are used to traditional firewall rules (IP-based, perimeter-focused) requires helping them make the mental shift to identity-based, pod-level policy.

The most effective teaching approach combines a clear analogy for the policy model, a live demonstration of policy enforcement, and a hands-on exercise where team members write and test their own policies. This post provides all three.

## Prerequisites

- A working Calico cluster
- A simple two-tier application deployed (frontend and backend)
- `kubectl` access for demonstrations, and `calicoctl` access if your cluster manages Calico resources that way

## The Analogy: Pod Passports, Not Network Zones

Traditional network security thinks in terms of zones: "the DMZ can reach the backend, the internet cannot." This breaks down in Kubernetes where pods from different "zones" run on the same nodes and share network infrastructure.

Introduce Calico policy using the passport analogy:

> "Each pod has an identity - defined by its labels. Network policy is like a passport check at the pod's door: 'You can enter only if you have the right identity credentials (labels) and you're from the right namespace.' The check happens on every connection, for every pod, every time."

This reframes security from "which network segment is this from?" to "who is this pod and does it have permission to connect here?"

## Live Demo: The Three-Step Security Journey

Walk your team through three steps:

**Step 1: Show the open default**
```bash
# No policy applied - all pods can reach all pods

kubectl exec -n frontend-ns frontend-pod -- curl -s http://backend-svc.backend-ns.svc.cluster.local
# Success - the "open door" default
```

**Step 2: Close the door**
```bash
kubectl apply -f deny-all-ingress.yaml
kubectl exec -n frontend-ns frontend-pod -- curl --max-time 5 -s http://backend-svc.backend-ns.svc.cluster.local
# Timeout - door closed to everyone
```

**Step 3: Issue a passport**
```yaml
# allow-frontend-to-backend.yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-frontend
  namespace: backend-ns
spec:
  selector: app == 'backend'
  ingress:
  - action: Allow
    source:
      namespaceSelector: projectcalico.org/name == 'frontend-ns'
      selector: app == 'frontend'
```

```bash
kubectl apply -f allow-frontend-to-backend.yaml
kubectl exec -n frontend-ns frontend-pod -- curl -s http://backend-svc.backend-ns.svc.cluster.local
# Success - frontend has a "passport" to enter
kubectl exec -n frontend-ns other-pod -- curl --max-time 5 -s http://backend-svc.backend-ns.svc.cluster.local
# Timeout - other-pod doesn't have the right passport
```

The three steps make the policy model concrete and immediately comprehensible.

## Explaining Rule Evaluation

For developers who will write policies, explain the evaluation model clearly:

```mermaid
graph TD
    Packet[Incoming packet] --> Check{Any policy\nselects this pod?}
    Check -->|No| OPEN[Allow all\ndefault behavior]
    Check -->|Yes| EVAL[Evaluate Calico policies\nby tier/order, then rules top to bottom]
    EVAL --> MATCH{Matching rule action}
    MATCH --> ALLOW[Allow]
    MATCH --> DENY[Deny / Drop]
    MATCH --> LOG[Log and continue]
    MATCH --> NOMATCH[No match in any rule\nImplicit deny]
```

The "gotcha" moment: once a policy selects a pod for ingress or egress, the default for that direction flips to deny-all. Every legitimate communication in that direction must be explicitly allowed.

## Common Team Questions

**Q: Do I have to write a policy for every service?**
A: You should write a policy for every service you want to restrict. Start with the most sensitive services (databases, secrets stores). You don't have to restrict everything on day one.

**Q: What if I write a policy wrong and break my service?**
A: Use a lab cluster first. Production policy changes should go through code review. We can also start in "log only" mode with Calico to observe what would be blocked before enforcing.

**Q: Can two policies conflict?**
A: Kubernetes NetworkPolicy allows are additive - a packet is allowed if any applicable policy allows it. Calico NetworkPolicy adds ordering and explicit `Deny`, so a matching `Allow` or `Deny` action is final according to tier and policy order. This means a more permissive policy can still unintentionally allow traffic unless you control ordering and review broad selectors carefully.

## Workshop Exercise

Have each team member write a NetworkPolicy for one service they own:
1. Start with a deny-all ingress for their service
2. Add allows for each legitimate caller
3. Test with both allowed and denied clients
4. Have a partner review their policy for unintended allows

## Best Practices

- Use Calico NetworkPolicy with explicit `action: Deny` for better auditability than Kubernetes NetworkPolicy's implicit deny
- Provide developers with policy templates for common patterns
- Start with observation (flow logs if using Cloud/Enterprise) before enforcement

## Conclusion

Teaching Calico network policy fundamentals is most effective with the passport analogy (identity-based access, not zone-based), the three-step demo (open, close, issue passport), and a hands-on workshop exercise. Once developers understand that the default flips to deny-all for a direction when policy selects their pod, and that Calico policies are evaluated by tier/order with rules evaluated top-to-bottom, they can write and debug their own policies confidently.
