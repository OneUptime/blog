# How to Use the Demo Application in the Cilium Star Wars Demo

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, eBPF, Network Policy, Star Wars Demo

Description: A practical guide to deploying and interacting with the Star Wars demo application to explore Cilium's policy capabilities hands-on.

---

## Introduction

Using the Star Wars demo application effectively means understanding the sequence of steps that reveal each policy layer. The application is a teaching tool, and the way you interact with it - running `curl` commands from specific pods, watching which succeed and which are blocked - is the methodology. This guide walks you through each interaction point with the demo application, explaining what to observe at each stage.

The goal is not just to run the demo but to develop intuitions you can carry into real environments. When you see the `xwing` get blocked, think about your unauthorized clients. When the `tiefighter` gets blocked from `/v1/exhaust-port`, think about your privileged admin APIs. The concrete commands here translate directly to debugging and designing policy in production.

This guide is meant to be run interactively alongside your cluster. Do not skip steps - the sequence is designed to build understanding progressively.

## Prerequisites

- Kubernetes cluster with Cilium as CNI
- `kubectl` configured
- Cilium CLI installed

## Step 1: Deploy the Application

```bash
# Create the demo namespace (optional, demo uses default)
kubectl create -f https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/http-sw-app.yaml

# Wait for all pods to be running
kubectl wait --for=condition=Ready pod --all --timeout=90s

# Verify deployments
kubectl get deployments,pods,services
```

## Step 2: Interact with Open Access

```bash
# Successful landing request from authorized Empire ship
kubectl exec tiefighter -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing

# Unauthorized access from Alliance ship (also works - no policy yet)
kubectl exec xwing -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing

# Dangerous exhaust port - open to anyone right now
kubectl exec tiefighter -- curl -s -XPUT deathstar.default.svc.cluster.local/v1/exhaust-port
```

## Step 3: Apply and Verify L3/L4 Policy

```bash
# Apply L3/L4 policy restricting deathstar access to Empire ships
kubectl create -f https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/sw_l3_l4_policy.yaml

# Verify policy is loaded
kubectl get CiliumNetworkPolicy

# Re-test: xwing should now be blocked
kubectl exec xwing -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing
# (should timeout or hang - Cilium drops the packet silently)

# tiefighter still works
kubectl exec tiefighter -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing
```

## Step 4: Demonstrate the L3/L4 Limitation

```bash
# tiefighter can still hit the dangerous endpoint at L3/L4
kubectl exec tiefighter -- curl -s -XPUT deathstar.default.svc.cluster.local/v1/exhaust-port
# This still works! L3/L4 policy only controls connection, not HTTP paths
```

## Step 5: Apply L7 HTTP Policy

```bash
# Upgrade to L7 policy
kubectl apply -f https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/sw_l3_l4_l7_policy.yaml

# tiefighter landing still works
kubectl exec tiefighter -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing

# tiefighter exhaust port is now blocked
kubectl exec tiefighter -- curl -s -XPUT deathstar.default.svc.cluster.local/v1/exhaust-port
# Expected: Access denied
```

## Step 6: Observe with Cilium Monitor

```bash
# Watch policy drops in real time (run in separate terminal)
kubectl exec -n kube-system ds/cilium -- cilium monitor --type drop

# In another terminal, trigger the blocked request
kubectl exec tiefighter -- curl -s -XPUT deathstar.default.svc.cluster.local/v1/exhaust-port
```

## Cleanup

```bash
# Remove the demo application
kubectl delete -f https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/http-sw-app.yaml
kubectl delete CiliumNetworkPolicy rule1
```

## Conclusion

Using the demo application interactively is the most effective way to internalize Cilium's policy model. Each command you run - the blocked `xwing`, the allowed `tiefighter`, the forbidden exhaust port - teaches a lesson about policy layers that static documentation cannot replicate. With these interactions fresh in mind, you are ready to design Cilium policies for your own production services.
