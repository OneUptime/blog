# How to Set Up Flux on AKS with Azure CNI Overlay

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Azure, AKS, Azure CNI, Overlay, Networking, CNI

Description: Learn how to set up Flux CD on an AKS cluster using Azure CNI Overlay networking for efficient IP address management and scalable GitOps deployments.

---

## Introduction

Azure CNI Overlay is a networking mode for AKS that assigns pod IP addresses from a private CIDR range independent of the Azure VNet address space. This solves the IP address exhaustion problem common with the default Azure CNI, where every pod consumes an IP from the VNet subnet. With CNI Overlay, you can scale to thousands of pods without worrying about subnet sizing.

Setting up Flux on an AKS cluster with CNI Overlay follows the standard Flux bootstrap process, but there are networking considerations for Flux controllers, webhook receivers, and notification providers that this guide addresses.

## Prerequisites

- An Azure subscription
- Azure CLI version 2.48 or later
- Flux CLI version 2.0 or later
- kubectl configured for your cluster

## Step 1: Create an AKS Cluster with CNI Overlay

Create a new AKS cluster with Azure CNI Overlay networking:

```bash
az aks create \
  --resource-group my-resource-group \
  --name my-overlay-cluster \
  --location eastus \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --pod-cidr 192.168.0.0/16 \
  --node-count 3 \
  --enable-managed-identity \
  --generate-ssh-keys
```

The `--pod-cidr` flag defines the address space for pods. This range does not need to come from your VNet and can overlap across clusters.

Verify the network configuration:

```bash
az aks show \
  --resource-group my-resource-group \
  --name my-overlay-cluster \
  --query "networkProfile" -o json
```

## Step 2: Get Cluster Credentials

```bash
az aks get-credentials \
  --resource-group my-resource-group \
  --name my-overlay-cluster
```

Verify connectivity and inspect the node and pod CIDR:

```bash
kubectl get nodes -o wide
kubectl get pods -A -o wide | head -20
```

You should see pod IPs from the 192.168.0.0/16 range, while node IPs come from the VNet subnet.

## Step 3: Bootstrap Flux

Bootstrap Flux on the CNI Overlay cluster:

```bash
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/my-overlay-cluster \
  --personal
```

Verify all Flux components are running:

```bash
flux check
kubectl get pods -n flux-system -o wide
```

## Step 4: Configure Network Policies

With CNI Overlay, network policies work at the pod level using the overlay CIDR. Deploy network policies through Flux to secure the flux-system namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-flux-controllers
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: flux-system
  egress:
    - {}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-webhook-receiver
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: notification-controller
  policyTypes:
    - Ingress
  ingress:
    - ports:
        - port: 9292
          protocol: TCP
```

## Step 5: Deploy Applications with Service Exposure

In CNI Overlay mode, services of type LoadBalancer work the same as with standard CNI. Deploy an application through Flux:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web-app
          image: nginx:latest
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: default
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
spec:
  type: LoadBalancer
  selector:
    app: web-app
  ports:
    - port: 80
      targetPort: 80
```

## Step 6: Configure Flux Webhook Receiver

Set up a Flux webhook receiver that can be reached from outside the cluster. With CNI Overlay, the webhook needs a LoadBalancer or Ingress:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-webhook
  namespace: flux-system
spec:
  type: github
  events:
    - "ping"
    - "push"
  secretRef:
    name: webhook-token
  resources:
    - kind: GitRepository
      name: flux-system
---
apiVersion: v1
kind: Service
metadata:
  name: webhook-receiver
  namespace: flux-system
spec:
  type: LoadBalancer
  selector:
    app: notification-controller
  ports:
    - port: 80
      targetPort: 9292
```

## Step 7: Manage with Flux Kustomization

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps
  prune: true
  targetNamespace: default
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: network-policies
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/network-policies
  prune: true
```

## CNI Overlay vs Standard CNI Considerations for Flux

**IP address space**: With CNI Overlay, pod IPs are from a private CIDR that does not consume VNet addresses. This means Flux deployments can scale without IP address planning concerns.

**Service connectivity**: Internal LoadBalancer services still receive IPs from the VNet subnet. This is important for Flux webhook receivers that need to be reachable from Azure DevOps or GitHub.

**Network policies**: Network policies reference pod IPs from the overlay CIDR. Policies work the same way as with standard CNI, but the IP ranges differ.

**Performance**: CNI Overlay adds a small encapsulation overhead compared to standard CNI. For most Flux workloads, this is negligible.

## Verifying the Setup

```bash
flux get all -A
kubectl get pods -A -o wide
kubectl get networkpolicies -A
kubectl get svc -A | grep LoadBalancer
```

## Troubleshooting

**Pods cannot reach external services**: Ensure outbound rules allow traffic from the overlay CIDR. Check NAT gateway or load balancer outbound rules.

**Network policies not enforcing**: Verify that Azure Network Policy Manager or Calico is enabled. CNI Overlay supports both policy engines.

**Webhook receiver unreachable**: If using an internal load balancer, ensure the source (GitHub, Azure DevOps) can reach the VNet through a private endpoint or VPN.

## Conclusion

AKS with Azure CNI Overlay provides a scalable networking foundation for Flux-managed clusters. By decoupling pod IPs from VNet address space, you can run large-scale GitOps deployments without IP address planning overhead. The Flux setup process is straightforward, with the main consideration being how network policies and service exposure interact with the overlay network.
