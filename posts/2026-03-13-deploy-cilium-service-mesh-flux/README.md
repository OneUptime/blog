# How to Deploy Cilium Service Mesh with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Cilium, Service Mesh, eBPF, Sidecarless, CNI

Description: Deploy Cilium as a service mesh with Flux CD using eBPF-based networking for high-performance, sidecarless mutual TLS and observability.

---

## Introduction

Cilium is a high-performance Kubernetes CNI plugin and service mesh that uses eBPF to implement networking, security, and observability directly in the Linux kernel — without sidecar proxies. Its service mesh capabilities include Transparent Encryption (WireGuard or IPsec), mutual authentication, L7 policy enforcement, and deep observability through Hubble.

Managing Cilium through Flux CD gives your platform team a reproducible, GitOps-driven CNI and service mesh deployment. Cilium configuration changes — whether enabling new features or adjusting policy enforcement modes — flow through pull requests.

This guide covers deploying Cilium with service mesh features enabled using Flux CD HelmRelease.

## Prerequisites

- Kubernetes cluster where you can install a CNI (bare metal, EKS with custom CNI, or GKE Dataplane V2)
- Flux CD v2 bootstrapped to your Git repository
- Nodes running Linux kernel 5.4+ (5.10+ recommended for full eBPF feature support)

## Step 1: Create Namespace and HelmRepository

```yaml
# clusters/my-cluster/cilium/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cilium
  labels:
    app.kubernetes.io/managed-by: flux
---
# clusters/my-cluster/cilium/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cilium
  namespace: flux-system
spec:
  interval: 12h
  url: https://helm.cilium.io/
```

## Step 2: Deploy Cilium with Service Mesh Features

```yaml
# clusters/my-cluster/cilium/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: cilium
  namespace: cilium
spec:
  interval: 1h
  chart:
    spec:
      chart: cilium
      version: "1.15.*"
      sourceRef:
        kind: HelmRepository
        name: cilium
        namespace: flux-system
      interval: 12h
  values:
    # eBPF-based kube-proxy replacement
    kubeProxyReplacement: true
    k8sServiceHost: "api.my-cluster.example.com"
    k8sServicePort: "6443"

    # Enable service mesh features
    envoy:
      enabled: true  # L7 proxy for service mesh features

    # Enable mutual authentication (no sidecars needed)
    authentication:
      mutual:
        spire:
          enabled: false
      mode: required

    # WireGuard transparent encryption for pod-to-pod traffic
    encryption:
      enabled: true
      type: wireguard
      wireguard:
        userspaceFallback: false

    # Hubble observability
    hubble:
      enabled: true
      relay:
        enabled: true
        replicas: 1
      ui:
        enabled: true
        replicas: 1
      metrics:
        enabled:
          - dns
          - drop
          - tcp
          - flow
          - port-distribution
          - icmp
          - httpV2:exemplars=true;labelsContext=source_ip,source_namespace,source_workload,destination_ip,destination_namespace,destination_workload,traffic_direction

    # Prometheus metrics
    prometheus:
      enabled: true
      port: 9962

    # Resource configuration
    resources:
      requests:
        cpu: 100m
        memory: 512Mi

    # Operator configuration
    operator:
      replicas: 1
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
```

## Step 3: Create the Flux Kustomization

```yaml
# clusters/my-cluster/cilium/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
---
# clusters/my-cluster/flux-kustomization-cilium.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cilium
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/cilium
  prune: false   # Never accidentally remove the CNI
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: cilium
      namespace: cilium
    - apiVersion: apps/v1
      kind: Deployment
      name: cilium-operator
      namespace: cilium
```

## Step 4: Configure CiliumNetworkPolicy for L7

```yaml
# clusters/my-cluster/cilium-policies/api-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-service-policy
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: api-service
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend-service
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            # L7 HTTP rules (requires Envoy proxy in Cilium)
            http:
              - method: GET
                path: /api/.*
              - method: POST
                path: /api/orders
```

## Step 5: Validate Cilium Service Mesh

```bash
# Check Cilium is running on all nodes
kubectl get daemonset cilium -n cilium

# Verify encryption is enabled
cilium status | grep "Encryption"

# View Hubble flows
kubectl port-forward svc/hubble-relay 4245:80 -n cilium
hubble observe --namespace production --last 50

# Access Hubble UI
kubectl port-forward svc/hubble-ui 12000:80 -n cilium
# Open http://localhost:12000

# Check Cilium connectivity
cilium connectivity test

# Verify WireGuard peers
kubectl exec -n cilium daemonset/cilium -- \
  cilium debuginfo | grep wireguard
```

## Best Practices

- Set `prune: false` on the Cilium Flux Kustomization — removing the CNI DaemonSet would lose all cluster networking.
- Enable `kubeProxyReplacement: true` to replace kube-proxy with Cilium's eBPF implementation for better performance and feature parity.
- Use WireGuard encryption (`encryption.type: wireguard`) for transparent encryption between pods — it is significantly faster than IPsec for most workloads.
- Enable Hubble with all relevant metric types for full L4/L7 observability — Hubble's flow log is invaluable for debugging network policy issues.
- Test Cilium CNI changes in a dedicated cluster or node pool before applying to production, as CNI changes can disrupt all pod networking if misconfigured.

## Conclusion

Cilium as a service mesh deployed through Flux CD provides eBPF-powered networking, transparent encryption, and L7 observability without sidecar overhead. The CNI configuration, network policy, and service mesh features are all version-controlled and continuously reconciled by Flux — giving your platform team a powerful, modern networking foundation managed with GitOps rigor.
