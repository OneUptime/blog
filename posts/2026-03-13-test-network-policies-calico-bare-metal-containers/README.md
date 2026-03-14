# How to Test Network Policies with Calico on Bare Metal with Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Containers, Network Policies

Description: A guide to testing Calico network policies on a bare metal Kubernetes cluster running containers to validate traffic isolation behavior.

---

## Introduction

Testing network policies on a bare metal Calico cluster validates that your security posture is correctly enforced at the pod level. Because bare metal clusters often serve performance-sensitive workloads — databases, caches, and compute-intensive services — network policy testing must not only confirm that policies block unwanted traffic, but also that policy enforcement does not introduce latency for allowed traffic.

Calico programs network policies into iptables or the eBPF dataplane depending on your configuration. Testing policies explicitly confirms that the programming succeeded and that the dataplane behavior matches your intent. Both standard Kubernetes NetworkPolicy resources and Calico's own GlobalNetworkPolicy CRDs should be tested.

This guide covers network policy testing on a bare metal Kubernetes cluster with Calico.

## Prerequisites

- Calico running on a bare metal Kubernetes cluster with containers
- `kubectl` and `calicoctl` installed
- Basic understanding of Calico's policy model

## Step 1: Create Test Namespaces

```bash
kubectl create namespace frontend
kubectl create namespace backend
```

## Step 2: Deploy a Backend Service

```bash
kubectl run api-server --image=nginx --labels="tier=backend" -n backend
kubectl expose pod api-server --port=80 -n backend
```

## Step 3: Deploy Frontend Clients

```bash
kubectl run frontend-pod --image=busybox --labels="tier=frontend" -n frontend -- sleep 3600
kubectl run other-pod --image=busybox --labels="tier=other" -n backend -- sleep 3600
```

## Step 4: Apply a Cross-Namespace Policy

Allow only pods from the `frontend` namespace to reach the backend API server.

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-frontend
  namespace: backend
spec:
  selector: tier == 'backend'
  ingress:
    - action: Allow
      source:
        namespaceSelector: kubernetes.io/metadata.name == 'frontend'
        selector: tier == 'frontend'
  types:
    - Ingress
```

```bash
calicoctl apply -f allow-frontend.yaml
```

## Step 5: Test Policy Enforcement

The frontend pod should be able to reach the backend.

```bash
BACKEND_IP=$(kubectl get pod api-server -n backend -o jsonpath='{.status.podIP}')
kubectl exec -n frontend frontend-pod -- wget -qO- --timeout=5 http://$BACKEND_IP
```

The other pod in the backend namespace should be blocked.

```bash
kubectl exec -n backend other-pod -- wget -qO- --timeout=5 http://api-server || echo "Blocked"
```

## Step 6: Test Latency Impact of Policy Enforcement

Measure the round-trip time for an allowed connection to verify policy enforcement overhead is minimal.

```bash
kubectl exec -n frontend frontend-pod -- sh -c \
  "time wget -qO- --timeout=5 http://$BACKEND_IP > /dev/null"
```

On bare metal with eBPF dataplane, policy enforcement overhead should be under 0.1ms.

## Conclusion

Testing Calico network policies on bare metal with containers requires deploying workloads across namespaces, applying Calico NetworkPolicy resources, and explicitly verifying that both allowed and denied connections behave correctly. Measuring latency for allowed connections confirms that policy enforcement is not degrading the high-throughput, low-latency performance that bare metal hardware is capable of delivering.
