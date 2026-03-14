# How to Use the Cilium Star Wars Demo

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, eBPF, Networking, Network Policy, Tutorial

Description: A step-by-step guide to running the Cilium Star Wars demo from deployment through L7 policy enforcement.

---

## Introduction

The Cilium Star Wars demo is the fastest way to experience Cilium's network policy capabilities hands-on. In roughly fifteen minutes, you can deploy the demo application, observe unrestricted access, apply progressively restrictive policies, and watch Cilium enforce them in real time. This guide walks you through each step of the demo with the actual commands you need to run.

The demo is designed to be run on a local cluster (minikube or kind) or any Kubernetes environment where Cilium is installed as the CNI. Each stage of the demo builds on the last, so it is best to follow the steps in order rather than jumping ahead. Pay attention to the output of each `curl` command — the difference between a successful landing request and a dropped connection is the entire point.

This tutorial is intentionally hands-on. Rather than describing what the demo does abstractly, this guide puts you in the pilot's seat.

## Prerequisites

- Kubernetes cluster with Cilium installed
- `kubectl` configured to access the cluster
- Cilium CLI installed (`cilium` binary)
- `curl` available in test pods (the demo images include it)

## Step 1: Deploy the Demo Application

```bash
# Deploy the Star Wars application
kubectl create -f https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/http-sw-app.yaml

# Wait for pods to be ready
kubectl get pods -w

# Expected output:
# NAME                         READY   STATUS    RESTARTS   AGE
# deathstar-xxxxx-yyyy         1/1     Running   0          30s
# deathstar-xxxxx-zzzz         1/1     Running   0          30s
# tiefighter                   1/1     Running   0          30s
# xwing                        1/1     Running   0          30s
```

## Step 2: Test Unrestricted Access

```bash
# Empire ship landing (should succeed)
kubectl exec tiefighter -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing

# Alliance ship landing (should also succeed - no policy yet)
kubectl exec xwing -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing
```

Both requests should return `Ship landed`. This is the problem the demo sets out to fix.

## Step 3: Apply L3/L4 Policy

```bash
# Apply the basic L3/L4 network policy
kubectl create -f https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/sw_l3_l4_policy.yaml

# Verify the policy was created
kubectl get ciliumnetworkpolicies
```

## Step 4: Test L3/L4 Policy Enforcement

```bash
# Empire ship - should still succeed
kubectl exec tiefighter -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing

# Alliance ship - should now be blocked (connection will hang/timeout)
kubectl exec xwing -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing
```

The `xwing` request will now be dropped silently by Cilium at the kernel level.

## Step 5: Apply L7 HTTP Policy

```bash
# Apply the L7 HTTP-aware policy
kubectl apply -f https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/sw_l3_l4_l7_policy.yaml

# Test: tiefighter landing request - allowed
kubectl exec tiefighter -- curl -s -XPOST deathstar.default.svc.cluster.local/v1/request-landing

# Test: tiefighter exhaust port - blocked at L7
kubectl exec tiefighter -- curl -s -XPUT deathstar.default.svc.cluster.local/v1/exhaust-port
```

The exhaust port request returns `Access denied` because the L7 policy only permits `POST /v1/request-landing`.

## Step 6: Observe Policy with Cilium CLI

```bash
# Check Cilium status
cilium status

# Monitor network flows in real time
cilium monitor --type drop
cilium monitor --type l7
```

## Conclusion

The Cilium Star Wars demo takes you from zero policy to L7-aware enforcement in five concrete steps. Each step builds your intuition for how Cilium policies compose and how eBPF enables the enforcement to happen transparently in the kernel. With this foundation, you are ready to translate these concepts into production policies for your own services.
