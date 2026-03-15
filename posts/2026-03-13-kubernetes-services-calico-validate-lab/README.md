# How to Validate Kubernetes Services with Calico in a Lab Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Services, CNI, Lab, Testing, Validation, Kube-proxy, eBPF

Description: Step-by-step validation tests for Kubernetes service connectivity and network policy enforcement for service traffic in a Calico lab cluster.

---

## Introduction

Service connectivity validation with Calico involves testing more than just "can I reach the ClusterIP." You need to verify that load balancing works, that network policy applies correctly to service traffic, and that source IPs are preserved as expected for your dataplane mode.

This guide provides a structured validation suite for service networking with Calico, covering ClusterIP, NodePort, and headless services, with and without network policy.

## Prerequisites

- A Calico lab cluster
- `kubectl` configured
- Test pods deployed for client and server roles

## Setup: Deploy Service Test Infrastructure

```bash
# Deploy a backend with multiple replicas for load balancing tests
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: hashicorp/http-echo
        args: ["-text=hello-from-$(hostname)"]
        ports:
        - containerPort: 5678
EOF

kubectl expose deployment backend --port=80 --target-port=5678 --name=backend-svc

# Deploy a client pod
kubectl run client --image=nicolaka/netshoot -- sleep 3600
```

## Validation 1: ClusterIP Connectivity

```bash
SVC_IP=$(kubectl get svc backend-svc -o jsonpath='{.spec.clusterIP}')

kubectl exec client -- wget -qO- http://$SVC_IP
# Expected: "hello-from-<pod-name>"
```

## Validation 2: DNS-Based Service Resolution

```bash
kubectl exec client -- wget -qO- http://backend-svc.default.svc.cluster.local
# Expected: "hello-from-<pod-name>"

kubectl exec client -- nslookup backend-svc.default.svc.cluster.local
# Expected: ClusterIP returned
```

## Validation 3: Load Balancing Across Replicas

Run multiple requests and observe responses from different pods:

```bash
for i in $(seq 1 10); do
  kubectl exec client -- wget -qO- http://backend-svc
done
# Expected: Mix of different pod hostnames (load balancing active)
```

## Validation 4: NodePort Service Access

```bash
kubectl expose deployment backend --type=NodePort --name=backend-nodeport \
  --port=80 --target-port=5678

NODE_PORT=$(kubectl get svc backend-nodeport \
  -o jsonpath='{.spec.ports[0].nodePort}')
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}')

# Access via NodePort
kubectl exec client -- wget -qO- http://$NODE_IP:$NODE_PORT
# Expected: "hello-from-<pod-name>"
```

## Validation 5: Network Policy Enforcement on Service Traffic

Apply a deny-all ingress to backend pods and verify the service becomes unreachable:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-backend
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress: []
EOF

kubectl exec client -- wget --timeout=5 -qO- http://backend-svc
# Expected: timeout (policy blocks ingress even via service)
```

Allow traffic from the client:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-client-to-backend
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          run: client
    ports:
    - port: 5678
EOF

kubectl exec client -- wget --timeout=10 -qO- http://backend-svc
# Expected: success (client is now explicitly allowed)
```

## Validation 6: Headless Service Resolution

```bash
kubectl expose deployment backend --clusterIP=None --name=backend-headless \
  --port=80 --target-port=5678

kubectl exec client -- nslookup backend-headless.default.svc.cluster.local
# Expected: Multiple A records, one per backend pod IP (not a single ClusterIP)
```

## Validation Checklist

| Test | Expected Result |
|---|---|
| ClusterIP connectivity | Success |
| DNS resolution | ClusterIP returned |
| Load balancing | Multiple pod hostnames observed |
| NodePort access | Success via node IP |
| Deny-all blocks service | Timeout |
| Allow-from-client restores access | Success |
| Headless DNS returns pod IPs | Multiple A records |

## Best Practices

- Validate service connectivity from pods, not from the node - node connectivity bypasses Calico pod policy
- Use `kubectl get endpoints backend-svc` to verify that backend pods are in the service endpoints list
- Test headless services separately - they bypass kube-proxy entirely and have different DNS behavior

## Conclusion

Service validation with Calico requires testing connectivity at multiple levels: ClusterIP routing, DNS resolution, load balancing, NodePort access, and network policy enforcement on service traffic. The validation suite above confirms that all service types work correctly and that network policy applies as expected to pods serving service traffic.
