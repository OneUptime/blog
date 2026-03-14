# Automating Cilium Post-Installation Steps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: A guide to automating Cilium post-installation steps using Helm, ArgoCD, Flux, and CI/CD pipelines for reproducible, consistent deployments.

---

## Introduction

Manual post-installation steps are prone to human error and inconsistency across environments. Automating Cilium's post-installation configuration - Hubble enablement, network policy deployment, encryption setup, and connectivity validation - ensures that every cluster environment starts in the same known-good state. This is essential for organizations with multiple clusters (dev, staging, production) or that use GitOps workflows for infrastructure management.

This guide shows how to automate each post-installation step using Helm values, Kubernetes manifests, ArgoCD Applications, and CI/CD pipeline scripts. The goal is a fully automated Cilium deployment where a single `helm install` or `argocd app sync` command produces a complete, validated Cilium installation.

## Prerequisites

- Helm 3 installed
- `kubectl` configured
- Optionally: ArgoCD or Flux installed for GitOps

## Automating with Helm Values

All Cilium features can be configured via Helm values, making `helm install` a single-step deployment.

```bash
# values-production.yaml
cat > values-production.yaml <<EOF
hubble:
  enabled: true
  relay:
    enabled: true
  ui:
    enabled: true
  metrics:
    enabled:
    - drop
    - tcp
    - flow
    - icmp
    - http

encryption:
  enabled: true
  type: wireguard

prometheus:
  enabled: true
  serviceMonitor:
    enabled: true

ipam:
  mode: kubernetes

kubeProxyReplacement: strict
EOF

# Install with production values
helm install cilium cilium/cilium \
  --namespace kube-system \
  --values values-production.yaml

# Verify
cilium status
```

## Automating Policy Deployment

Store network policies in Git and apply them automatically:

```bash
# Directory structure for GitOps
# policies/
#   default-deny.yaml
#   allow-dns.yaml
#   app-policies/
#     frontend-to-backend.yaml
#     backend-to-db.yaml

# Apply all policies
kubectl apply -f policies/ --recursive

# Or with Kustomize
kubectl apply -k policies/
```

## ArgoCD Application for Cilium

```yaml
# cilium-argocd-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cilium
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://helm.cilium.io/
    targetRevision: 1.15.x
    chart: cilium
    helm:
      valuesFiles:
      - values-production.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: kube-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Flux HelmRelease for Cilium

```yaml
# cilium-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cilium
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: cilium
      version: ">=1.15.0 <2.0.0"
      sourceRef:
        kind: HelmRepository
        name: cilium
        namespace: flux-system
  values:
    hubble:
      enabled: true
      relay:
        enabled: true
    encryption:
      enabled: true
      type: wireguard
```

## CI/CD Post-Installation Validation

```bash
#!/bin/bash
# post-install-validate.sh - Run after every Cilium deployment
set -e

MAX_WAIT=300
INTERVAL=10

echo "Waiting for Cilium to be ready..."
until cilium status --wait --wait-duration=5s 2>/dev/null; do
  if [ $SECONDS -gt $MAX_WAIT ]; then
    echo "Timeout waiting for Cilium"
    exit 1
  fi
  sleep $INTERVAL
done

echo "Running connectivity tests..."
cilium connectivity test \
  --test pod-to-pod \
  --test pod-to-service \
  --timeout 10m \
  --connect-timeout 30s

echo "Checking Hubble..."
cilium hubble port-forward &
PF_PID=$!
sleep 5
hubble status || { kill $PF_PID; echo "Hubble check failed"; exit 1; }
kill $PF_PID

echo "Post-installation validation complete!"
```

## Automating with Terraform

```hcl
# cilium.tf - Deploy Cilium via Helm provider
resource "helm_release" "cilium" {
  name       = "cilium"
  repository = "https://helm.cilium.io/"
  chart      = "cilium"
  version    = "1.15.x"
  namespace  = "kube-system"

  set {
    name  = "hubble.enabled"
    value = "true"
  }
  set {
    name  = "hubble.relay.enabled"
    value = "true"
  }
  set {
    name  = "encryption.enabled"
    value = "true"
  }
  set {
    name  = "encryption.type"
    value = "wireguard"
  }
}
```

## Conclusion

Automating Cilium post-installation steps through Helm values, GitOps tooling, and CI/CD validation pipelines transforms an error-prone manual process into a reliable, reproducible deployment workflow. By encoding all configuration in version-controlled files and automating the post-deployment validation, you ensure every cluster environment starts in the same known-good state and that any deviation is caught immediately by the pipeline.
