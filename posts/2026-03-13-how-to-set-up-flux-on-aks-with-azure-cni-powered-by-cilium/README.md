# How to Set Up Flux on AKS with Azure CNI Powered by Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Azure, AKS, Azure CNI, Cilium, Networking, eBPF, Network Policy

Description: Learn how to set up Flux CD on an AKS cluster using Azure CNI powered by Cilium for advanced networking, eBPF-based network policies, and observability.

---

## Introduction

Azure CNI powered by Cilium combines the Azure CNI networking model with Cilium's eBPF data plane. This integration provides high-performance networking, advanced network policies with L7 filtering, and built-in observability through Hubble. For GitOps workflows with Flux, Cilium's advanced network policy capabilities offer fine-grained control over traffic between Flux controllers and your workloads.

This guide walks through creating an AKS cluster with Cilium, bootstrapping Flux, and leveraging Cilium's features to secure and observe your GitOps pipeline.

## Prerequisites

- An Azure subscription
- Azure CLI version 2.48 or later with the aks-preview extension
- Flux CLI version 2.0 or later
- kubectl and Cilium CLI installed

## Step 1: Install the AKS Preview Extension

Cilium integration requires the AKS preview extension:

```bash
az extension add --name aks-preview
az extension update --name aks-preview

az feature register \
  --namespace Microsoft.ContainerService \
  --name CiliumDataplanePreview

az provider register --namespace Microsoft.ContainerService
```

## Step 2: Create an AKS Cluster with Cilium

```bash
az aks create \
  --resource-group my-resource-group \
  --name my-cilium-cluster \
  --location eastus \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --network-dataplane cilium \
  --pod-cidr 192.168.0.0/16 \
  --node-count 3 \
  --enable-managed-identity \
  --generate-ssh-keys
```

Get cluster credentials and verify Cilium is running:

```bash
az aks get-credentials \
  --resource-group my-resource-group \
  --name my-cilium-cluster

kubectl get pods -n kube-system -l k8s-app=cilium
kubectl get pods -n kube-system -l app.kubernetes.io/name=hubble-relay
```

## Step 3: Bootstrap Flux

```bash
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/my-cilium-cluster \
  --personal
```

Verify Flux components:

```bash
flux check
kubectl get pods -n flux-system
```

## Step 4: Deploy Cilium Network Policies Through Flux

Cilium supports both standard Kubernetes NetworkPolicy and its own CiliumNetworkPolicy CRD, which offers L7 filtering and DNS-based rules. Deploy these through Flux:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: flux-system-policy
  namespace: flux-system
spec:
  endpointSelector: {}
  egress:
    - toEndpoints:
        - matchLabels:
            io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
          rules:
            dns:
              - matchPattern: "*"
    - toFQDNs:
        - matchName: github.com
        - matchName: api.github.com
        - matchPattern: "*.githubusercontent.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
    - toFQDNs:
        - matchPattern: "*.azurecr.io"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
  ingress:
    - fromEndpoints:
        - matchLabels:
            io.kubernetes.pod.namespace: flux-system
```

This policy restricts Flux controllers to only communicate with DNS, GitHub, and ACR, providing a least-privilege network configuration.

## Step 5: Deploy Application-Level Network Policies

Define fine-grained policies for your applications:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-server-policy
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              - method: GET
                path: "/api/v1/.*"
              - method: POST
                path: "/api/v1/.*"
  egress:
    - toEndpoints:
        - matchLabels:
            app: database
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
```

## Step 6: Enable Hubble Observability

Hubble provides real-time network flow visibility. Configure it through Flux:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hubble-config
  namespace: kube-system
data:
  enable-hubble: "true"
  hubble-listen-address: ":4244"
  hubble-metrics-server: ":9965"
  hubble-metrics: "dns:query;ignoreAAAA,drop,tcp,flow,icmp,httpV2:exemplars=true;labelsContext=source_ip,source_namespace,source_workload,destination_ip,destination_namespace,destination_workload,traffic_direction"
```

To view network flows, use the Cilium CLI:

```bash
cilium hubble port-forward &
hubble observe --namespace flux-system
hubble observe --namespace default --protocol http
```

## Step 7: Deploy a Hubble UI Through Flux

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cilium
  namespace: flux-system
spec:
  interval: 1h
  url: https://helm.cilium.io/
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: hubble-ui
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: cilium
      version: "1.15.*"
      sourceRef:
        kind: HelmRepository
        name: cilium
  targetNamespace: kube-system
  values:
    hubble:
      relay:
        enabled: true
      ui:
        enabled: true
```

## Step 8: Organize with Flux Kustomizations

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cilium-policies
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/cilium-policies
  prune: true
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: cilium-policies
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps
  prune: true
```

## Cilium Features Relevant to Flux Workflows

**DNS-based policies**: Restrict Flux controllers to specific external domains (Git providers, registries) without hardcoding IP addresses.

**L7 HTTP filtering**: Control which HTTP methods and paths are allowed between services, providing application-layer security for your GitOps-deployed workloads.

**Flow observability**: Use Hubble to debug connectivity issues between Flux controllers and source repositories, or between your deployed services.

**eBPF performance**: Cilium's eBPF data plane provides better networking performance compared to iptables-based solutions, which benefits clusters with many Flux-managed resources.

## Verifying the Setup

```bash
flux get all -A
kubectl get ciliumnetworkpolicies -A
cilium status
hubble observe --namespace flux-system --last 10
```

## Troubleshooting

**Flux controllers cannot reach GitHub**: Check CiliumNetworkPolicy egress rules. Use `hubble observe --namespace flux-system --verdict DROPPED` to identify dropped flows.

**Cilium agent not running**: Verify the cluster was created with `--network-dataplane cilium`. Cilium cannot be added to existing clusters that use a different dataplane.

**Hubble relay connection refused**: Ensure the Hubble relay pod is running and the port-forward is active.

## Conclusion

AKS with Azure CNI powered by Cilium provides advanced networking capabilities that complement Flux's GitOps model. Cilium's DNS-based network policies let you define least-privilege network rules for Flux controllers, while Hubble gives you visibility into every network flow in your cluster. By managing Cilium policies through Flux, you maintain a fully declarative, version-controlled approach to both application deployment and network security.
