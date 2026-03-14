# Tune Calico with Helm for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, Helm

Description: Learn how to tune Calico networking for production environments using Helm, enabling reproducible, version-controlled network configuration that integrates with GitOps workflows.

---

## Introduction

Helm is the most popular Kubernetes package manager, and using it to manage Calico installations provides significant advantages: reproducible deployments, version-controlled configuration, and easy upgrades. For production environments, managing Calico through Helm values files also integrates naturally with GitOps workflows using tools like Flux or ArgoCD.

Tuning Calico via Helm means expressing all performance and behavior settings as Helm values rather than post-install patches. This approach ensures that every cluster in your fleet has identical, auditable Calico configuration, and that configuration changes go through your standard code review and deployment process.

This guide covers how to structure Helm values for production Calico deployments, including MTU optimization, IPAM configuration, Felix tuning, and resource allocation - all expressed as Helm values for GitOps compatibility.

## Prerequisites

- Kubernetes cluster with Helm v3 installed
- Calico Helm chart (from `https://docs.tigera.io/calico/charts`)
- `kubectl` with cluster-admin permissions
- Git repository for storing Helm values (for GitOps)
- `calicoctl` for validation after deployment

## Step 1: Add the Calico Helm Repository

Add and verify the official Calico Helm chart repository.

```bash
# Add the Tigera Calico Helm repository
helm repo add projectcalico https://docs.tigera.io/calico/charts

# Update the local Helm chart cache
helm repo update

# Search for available Calico chart versions
helm search repo projectcalico/tigera-operator --versions | head -10
```

## Step 2: Create a Production Helm Values File

Define a production-ready Helm values file with all tuning parameters set.

```yaml
# calico-production-values.yaml
# Production Helm values for Calico - store in version control

tigera-operator:
  # Resource limits for the Tigera operator
  resources:
    requests:
      cpu: 100m
      memory: 150Mi
    limits:
      cpu: 500m
      memory: 300Mi

installation:
  # Use Calico CNI with eBPF-compatible configuration
  cni:
    type: Calico

  # Configure IPAM for production block sizing
  calicoNetwork:
    # Set MTU for VXLAN - adjust based on your network (1450 for standard, 8951 for jumbo)
    mtu: 1450
    bgp: Disabled
    ipPools:
    - blockSize: 26
      cidr: 192.168.0.0/16
      # Use VXLAN for broad compatibility
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: all()

  # Resource limits for calico-node DaemonSet
  nodeMetricsPort: 9091
  typhaMetricsPort: 9093
```

## Step 3: Deploy Calico with Production Values

Install or upgrade Calico using the production values file.

```bash
# Install Calico using the production values file
helm install calico projectcalico/tigera-operator \
  --namespace tigera-operator \
  --create-namespace \
  --values calico-production-values.yaml \
  --version v3.28.0

# Verify the installation completed successfully
kubectl get tigerastatus calico
kubectl get pods -n calico-system
```

## Step 4: Apply Felix Tuning via Helm Post-Install

Some Felix parameters are best applied via calicoctl after the Helm installation completes.

```bash
# Wait for Calico to be fully ready
kubectl wait --for=condition=Available tigerastatus/calico --timeout=5m

# Apply production Felix tuning parameters
calicoctl patch felixconfiguration default --patch='{
  "spec": {
    "iptablesRefreshInterval": "90s",
    "routeRefreshInterval": "90s",
    "ipv6Support": false,
    "reportingInterval": "0s",
    "prometheusMetricsEnabled": true,
    "prometheusMetricsPort": 9091
  }
}'
```

## Step 5: Integrate with GitOps Using Flux

Manage the Calico Helm release via Flux for automated GitOps deployments.

```yaml
# flux-calico-helmrelease.yaml - Flux HelmRelease for production Calico
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: calico
  namespace: tigera-operator
spec:
  interval: 10m
  chart:
    spec:
      chart: tigera-operator
      version: "v3.28.0"
      sourceRef:
        kind: HelmRepository
        name: projectcalico
        namespace: flux-system
  # Reference the values from a ConfigMap or inline values
  values:
    installation:
      calicoNetwork:
        mtu: 1450
        ipPools:
        - blockSize: 26
          cidr: 192.168.0.0/16
          encapsulation: VXLAN
          natOutgoing: Enabled
```

## Best Practices

- Store all Helm values files in Git with PR-based change reviews
- Pin the Calico chart version explicitly - avoid using `latest` or ranges in production
- Use Helm `--atomic` flag during upgrades to auto-rollback on failure
- Separate Helm values files per environment (dev, staging, prod) with overlays
- Run `helm diff` before upgrading to review what will change
- Monitor `kubectl get tigerastatus` after each Helm upgrade to catch configuration errors

## Conclusion

Managing Calico with Helm provides a consistent, auditable, and GitOps-compatible approach to production network configuration. By encoding all tuning parameters in Helm values files, you ensure reproducible deployments across environments and make it easy to apply, review, and roll back network configuration changes through standard development workflows.
