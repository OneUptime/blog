# How to Test Network Policies with Calico on Self-Managed DigitalOcean Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, DigitalOcean, Network Policies

Description: A step-by-step guide to testing Calico network policies on a self-managed Kubernetes cluster running on DigitalOcean Droplets.

---

## Introduction

Network policies are the foundation of pod-to-pod traffic control in Kubernetes. When running Calico on self-managed clusters on DigitalOcean Droplets, validating that your policies behave as expected is critical before promoting workloads to production. A policy that appears correct in YAML can still have gaps that allow unintended traffic.

Calico extends the standard Kubernetes NetworkPolicy API with its own GlobalNetworkPolicy and NetworkPolicy resources, giving you fine-grained ingress and egress control. Testing these policies requires deliberately sending traffic between pods and confirming that allowed connections succeed and denied connections fail.

This guide walks through a structured testing workflow using simple client and server pods on a self-managed DigitalOcean Kubernetes cluster with Calico installed.

## Prerequisites

- A self-managed Kubernetes cluster on DigitalOcean Droplets with Calico installed
- `kubectl` configured to reach the cluster
- `calicoctl` installed and configured against the same cluster
- Basic familiarity with Kubernetes namespaces and pods

## Step 1: Deploy a Test Server

Deploy an nginx server in a dedicated namespace and label it so policies can target it.

```bash
kubectl create namespace policy-test
kubectl run server --image=nginx --labels="app=server" -n policy-test
kubectl expose pod server --port=80 -n policy-test
```

## Step 2: Deploy Test Clients

Deploy two clients — one that should be allowed and one that should be denied.

```bash
kubectl run allowed-client --image=busybox --labels="app=allowed-client" \
  -n policy-test -- sleep 3600
kubectl run denied-client --image=busybox --labels="app=denied-client" \
  -n policy-test -- sleep 3600
```

## Step 3: Apply a Network Policy

Create a policy that only allows traffic from pods with the label `app=allowed-client`.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-specific-client
  namespace: policy-test
spec:
  podSelector:
    matchLabels:
      app: server
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: allowed-client
  policyTypes:
    - Ingress
```

```bash
kubectl apply -f network-policy.yaml
```

## Step 4: Run Connectivity Tests

Test the allowed client — this should succeed.

```bash
kubectl exec -n policy-test allowed-client -- wget -qO- --timeout=5 http://server
```

Test the denied client — this should time out or be refused.

```bash
kubectl exec -n policy-test denied-client -- wget -qO- --timeout=5 http://server || echo "Connection denied as expected"
```

## Step 5: Inspect Calico Policy State

Use `calicoctl` to confirm Calico has programmed the policy.

```bash
calicoctl get networkpolicy -n policy-test -o wide
calicoctl get workloadendpoint -n policy-test
```

## Step 6: Clean Up

```bash
kubectl delete namespace policy-test
```

## Conclusion

Testing Calico network policies on self-managed DigitalOcean Kubernetes clusters involves deploying labeled client and server pods, applying targeted policies, and running explicit connectivity checks. This structured approach ensures your policies enforce the access controls you intend before traffic reaches production workloads.
