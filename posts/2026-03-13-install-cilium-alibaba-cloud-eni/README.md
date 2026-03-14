# Install Cilium on Alibaba Cloud with ENI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Alibaba Cloud, ENI, Kubernetes, Networking, eBPF, ACK

Description: Guide to installing Cilium on Alibaba Cloud Kubernetes clusters using ENI (Elastic Network Interface) for native cloud networking with eBPF security.

---

## Introduction

Alibaba Cloud Container Service for Kubernetes (ACK) supports Cilium as a CNI plugin using ENI (Elastic Network Interface) mode. In ENI mode, pods receive Alibaba Cloud VPC IPs directly through elastic network interfaces, providing native cloud networking performance while Cilium's eBPF dataplane handles network policies and observability.

This guide covers installing Cilium on an ACK cluster or self-managed Kubernetes on Alibaba Cloud ECS instances with ENI networking.

## Prerequisites

- Alibaba Cloud account with ACK or ECS access
- `aliyun` CLI installed and configured
- `kubectl` configured for your cluster
- `cilium` CLI installed: `curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/latest/download/cilium-linux-amd64.tar.gz && tar xf cilium-linux-amd64.tar.gz && sudo mv cilium /usr/local/bin/`
- RAM role with ENI permissions attached to ECS instances

## Step 1: Create ACK Cluster with Cilium

Using the Alibaba Cloud console or CLI to create an ACK cluster with Cilium:

```bash
# Create an ACK cluster with Cilium CNI using aliyun CLI
aliyun cs POST /clusters \
  --header "Content-Type=application/json" \
  --body '{
    "cluster_type": "ManagedKubernetes",
    "name": "my-cilium-cluster",
    "region_id": "cn-hangzhou",
    "kubernetes_version": "1.29.x",
    "container_cidr": "192.168.0.0/16",
    "service_cidr": "172.16.0.0/16",
    "addons": [
      {
        "name": "cilium",
        "config": ""
      }
    ],
    "worker_instance_types": ["ecs.c6.xlarge"],
    "num_of_nodes": 3
  }'
```

For self-managed Kubernetes, install Cilium with ENI mode via Helm:

```bash
# Add Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update
```

## Step 2: Install Cilium with ENI Mode

```yaml
# cilium-eni-values.yaml - Cilium values for Alibaba Cloud ENI mode
# Install via: helm install cilium cilium/cilium -f cilium-eni-values.yaml -n kube-system
ipam:
  # Use ENI mode for Alibaba Cloud native IP assignment
  mode: eni

eni:
  enabled: true
  # Alibaba Cloud specific: use VPC ENI IPs
  awsEnablePrefixDelegation: false

# Enable eBPF host routing
bpf:
  masquerade: true
  hostRouting: true

# Disable kube-proxy replacement (eBPF handles it)
kubeProxyReplacement: true
k8sServiceHost: <API_SERVER_IP>
k8sServicePort: "6443"

# Enable Hubble for observability
hubble:
  relay:
    enabled: true
  ui:
    enabled: true
```

Install Cilium:

```bash
# Install Cilium with ENI configuration
helm install cilium cilium/cilium \
  --version 1.15.0 \
  --namespace kube-system \
  -f cilium-eni-values.yaml

# Wait for Cilium to be ready
cilium status --wait
```

## Step 3: Verify ENI IP Allocation

```bash
# Check Cilium status
cilium status

# Verify pods are using Alibaba Cloud VPC IPs
kubectl get pods -A -o wide

# Check ENI allocation in Cilium agent
kubectl exec -n kube-system ds/cilium -- cilium endpoint list

# View ENI interfaces on a node
kubectl exec -n kube-system ds/cilium -- ip link show
```

## Step 4: Apply Cilium Network Policies

```yaml
# cilium-policy-eni.yaml - CiliumNetworkPolicy for ENI-based Cilium
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: backend
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
  egress:
    - toEndpoints:
        - matchLabels:
            k8s:io.kubernetes.pod.namespace: kube-system
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
```

## Step 5: Run Connectivity Tests

```bash
# Run Cilium's built-in connectivity test
cilium connectivity test

# Check Hubble for network flows
cilium hubble enable
kubectl port-forward -n kube-system svc/hubble-relay 4245:80 &
hubble observe --follow --namespace production
```

## Best Practices

- Attach the required RAM role to ECS instances for ENI attachment permissions
- Pre-warm ENI attachment to reduce pod scheduling latency in bursty workloads
- Enable Hubble for network flow visibility — it provides significant value in debugging ENI-based connectivity issues
- Use `CiliumClusterwideNetworkPolicy` for cluster-wide baseline rules
- Monitor ENI quota usage in Alibaba Cloud — each ECS instance type has a maximum ENI count

## Conclusion

Cilium with ENI mode on Alibaba Cloud provides native VPC IP assignment with eBPF-powered network policies and deep observability. The combination of Alibaba Cloud's ENI performance and Cilium's eBPF dataplane delivers excellent network throughput for containerized workloads. Enable Hubble from the start to benefit from Cilium's network observability capabilities alongside the performance advantages of ENI networking.
