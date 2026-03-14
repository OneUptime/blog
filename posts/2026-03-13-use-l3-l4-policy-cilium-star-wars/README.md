# How to Apply L3/L4 Policy in the Cilium Star Wars Demo

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, eBPF, Networking, Network Policy, Tutorial

Description: Step-by-step guide to applying and testing L3/L4 network policies in the Cilium Star Wars demo, with verification and troubleshooting commands.

---

## Introduction

Applying the first Cilium network policy is a milestone moment in the Star Wars demo. With one `kubectl create` command, you transform the Death Star from an open target accessible to anyone, including Rebel Alliance X-Wings, into a restricted facility that only accepts connections from Empire ships. This transformation happens in milliseconds because Cilium compiles the policy into eBPF maps that take effect immediately across all nodes.

This guide is a hands-on walkthrough of applying the L3/L4 policy, verifying it is enforced correctly, troubleshooting common issues, and observing the enforcement with Cilium's monitoring tools. Follow these steps in order on a cluster where the Star Wars demo is already deployed with no policies active.

## Prerequisites

- Star Wars demo deployed and verified working
- All four pods running: `tiefighter`, `xwing`, two `deathstar` pods
- No active `CiliumNetworkPolicy` resources
- Cilium CLI installed

## Step 1: Baseline Test Before Policy

```bash
# Confirm open access before applying policy
kubectl exec tiefighter -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing
# Expected: Ship landed

kubectl exec xwing -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing
# Expected: Ship landed (this is the problem)
```

## Step 2: Apply the L3/L4 Policy

```bash
# Apply the policy from the Cilium repository
kubectl create -f https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/sw_l3_l4_policy.yaml

# Verify it was created
kubectl get CiliumNetworkPolicy
# Expected: rule1 is listed

# Confirm Cilium has processed the policy
kubectl exec -n kube-system ds/cilium -- cilium policy get
```

## Step 3: Test Policy Enforcement

```bash
# Empire ship should still land
kubectl exec tiefighter -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing
# Expected: Ship landed

# Alliance ship should be blocked
kubectl exec xwing -- curl -s --max-time 5 -XPOST deathstar.default.svc.cluster.local/v1/request-landing
# Expected: connection timeout (packet dropped)
echo "Exit code: $?"
# Expected: non-zero exit code (28 = curl timeout)
```

## Step 4: Observe the Drop

```bash
# In a separate terminal, run the monitor before triggering the blocked request
kubectl exec -n kube-system ds/cilium -- cilium monitor --type drop

# Trigger the blocked request
kubectl exec xwing -- curl -s --max-time 5 -XPOST deathstar.default.svc.cluster.local/v1/request-landing
```

The monitor will show a drop event with the source identity (xwing) and destination (deathstar), plus the policy verdict.

## Step 5: Use Policy Tracing

```bash
# Trace what policy decision would be made
kubectl exec -n kube-system ds/cilium -- cilium policy trace \
  --src-k8s-pod default:xwing \
  --dst-k8s-svc default:deathstar \
  --dport 80 \
  --protocol tcp

# Trace from tiefighter (should show allow)
kubectl exec -n kube-system ds/cilium -- cilium policy trace \
  --src-k8s-pod default:tiefighter \
  --dst-k8s-svc default:deathstar \
  --dport 80 \
  --protocol tcp
```

## Step 6: Identify the L3/L4 Limitation

```bash
# Even with L3/L4 policy, tiefighter can hit all endpoints
kubectl exec tiefighter -- curl -s -XPUT deathstar.default.svc.cluster.local/v1/exhaust-port
# Expected: success (this is what L7 policy fixes)
```

## Conclusion

Applying the L3/L4 policy in the Cilium Star Wars demo is straightforward but impactful. In a single command, you establish the boundary between authorized and unauthorized access at the network level. The verification and observation commands in this guide give you confidence that the policy is working as intended. The remaining gap — HTTP path-level control — motivates the progression to L7 policy in the next step.
