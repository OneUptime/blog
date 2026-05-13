# Install Cilium on Alibaba Cloud with ENI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Alibaba Cloud, ENI, eBPF

Description: Guide to installing Cilium on Alibaba Cloud Kubernetes clusters using ENI (Elastic Network Interface) for native cloud networking with eBPF security.

---

## Introduction

Cilium supports Alibaba Cloud ENI (Elastic Network Interface) mode for Kubernetes clusters running on Alibaba Cloud. In Alibaba Cloud ENI mode, pods receive Alibaba Cloud VPC IPs directly through elastic network interfaces, providing native cloud networking performance while Cilium's eBPF dataplane handles network policies and observability.

This guide covers installing Cilium on an ACK cluster or self-managed Kubernetes on Alibaba Cloud ECS instances with ENI networking.

## Prerequisites

- Alibaba Cloud account with ACK or ECS access
- `aliyun` CLI installed and configured
- `kubectl` configured for your cluster
- `cilium` CLI installed: `curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/latest/download/cilium-linux-amd64.tar.gz && tar xf cilium-linux-amd64.tar.gz && sudo mv cilium /usr/local/bin/`
- Alibaba Cloud access keys with the required ENI and VPC permissions for Cilium

## Step 1: Prepare the Cluster

If you are installing Cilium on ACK, remove the ACK CNI DaemonSet first so Cilium can manage ENIs without conflicts. Delete only the DaemonSet that is present in your cluster:

```bash
# Common ACK CNI DaemonSet names include kube-flannel-ds, terway, terway-eni, and terway-eniip
kubectl -n kube-system delete daemonset <ack-cni-daemonset-name>

# Remove CRDs left by the previous CNI, if they exist
kubectl delete crd --ignore-not-found \
  ciliumclusterwidenetworkpolicies.cilium.io \
  ciliumendpoints.cilium.io \
  ciliumidentities.cilium.io \
  ciliumnetworkpolicies.cilium.io \
  ciliumnodes.cilium.io \
  bgpconfigurations.crd.projectcalico.org \
  clusterinformations.crd.projectcalico.org \
  felixconfigurations.crd.projectcalico.org \
  globalnetworkpolicies.crd.projectcalico.org \
  globalnetworksets.crd.projectcalico.org \
  hostendpoints.crd.projectcalico.org \
  ippools.crd.projectcalico.org \
  networkpolicies.crd.projectcalico.org
```

For self-managed Kubernetes, start by adding the Cilium Helm repository:

```bash
# Add Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update
```

## Step 2: Install Cilium with ENI Mode

Create the Alibaba Cloud credentials secret that Cilium uses to call the Alibaba Cloud API:

```yaml
# cilium-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cilium-alibabacloud
  namespace: kube-system
type: Opaque
data:
  ALIBABA_CLOUD_ACCESS_KEY_ID: "<base64-encoded-access-key-id>"
  ALIBABA_CLOUD_ACCESS_KEY_SECRET: "<base64-encoded-access-key-secret>"
```

```bash
kubectl apply -f cilium-secret.yaml
```

```yaml
# cilium-eni-values.yaml - Cilium values for Alibaba Cloud ENI mode
# Install via: helm install cilium cilium/cilium -f cilium-eni-values.yaml -n kube-system
ipam:
  # Use ENI mode for Alibaba Cloud native IP assignment
  mode: alibabacloud

alibabacloud:
  enabled: true

# Use native routing with Alibaba Cloud VPC IPs
routingMode: native
enableIPv4Masquerade: false

# Enable kube-proxy replacement
kubeProxyReplacement: true
k8sServiceHost: <API_SERVER_IP>
k8sServicePort: "6443"

# Enable Hubble for observability
hubble:
  enabled: true
  relay:
    enabled: true
  ui:
    enabled: true
```

Install Cilium:

```bash
# Install Cilium with ENI configuration
helm install cilium cilium/cilium \
  --version 1.19.3 \
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

# Check endpoints in the Cilium agent
kubectl exec -n kube-system ds/cilium -- cilium endpoint list

# Check ENI/IPAM allocation data in CiliumNode resources
kubectl get ciliumnodes.cilium.io -o wide
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
kubectl port-forward -n kube-system svc/hubble-relay 4245:80 &
hubble observe --follow --namespace production
```

## Best Practices

- Provide Alibaba Cloud access keys with the required ENI and VPC permissions
- Pre-warm ENI attachment to reduce pod scheduling latency in bursty workloads
- Enable Hubble for network flow visibility - it provides significant value in debugging ENI-based connectivity issues
- Use `CiliumClusterwideNetworkPolicy` for cluster-wide baseline rules
- Monitor ENI quota usage in Alibaba Cloud - each ECS instance type has a maximum ENI count

## Conclusion

Cilium with ENI mode on Alibaba Cloud provides native VPC IP assignment with eBPF-powered network policies and deep observability. The combination of Alibaba Cloud's ENI performance and Cilium's eBPF dataplane delivers excellent network throughput for containerized workloads. Enable Hubble from the start to benefit from Cilium's network observability capabilities alongside the performance advantages of ENI networking.
