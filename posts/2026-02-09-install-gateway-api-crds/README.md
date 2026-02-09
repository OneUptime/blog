# How to install Gateway API CRDs in Kubernetes cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, CRDs

Description: Learn how to install and configure Gateway API Custom Resource Definitions in your Kubernetes cluster as the foundation for modern ingress management.

---

The Kubernetes Gateway API represents the next generation of ingress and service mesh APIs, designed to overcome limitations in the original Ingress resource. Before you can use Gateway API features, you need to install the Custom Resource Definitions that define Gateway, HTTPRoute, and related resources. This installation process is straightforward but requires understanding which CRD versions and channels match your needs.

## Understanding Gateway API CRDs

Gateway API introduces several new resource types through CRDs: GatewayClass, Gateway, HTTPRoute, TLSRoute, TCPRoute, and UDPRoute. These resources provide a more expressive and extensible API for routing traffic into and within your cluster.

Unlike the built-in Ingress resource, Gateway API CRDs must be installed separately. This allows the API to evolve independently from Kubernetes releases.

## Installing Standard Gateway API CRDs

The simplest installation uses the standard channel, which includes stable and generally available resources.

```bash
# Install the latest stable Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml

# Verify installation
kubectl get crd | grep gateway
```

This installs GatewayClass, Gateway, HTTPRoute, and ReferenceGrant CRDs, which cover most common use cases.

## Installing Experimental Channel

For access to experimental features and preview resources, use the experimental channel.

```bash
# Install experimental Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/experimental-install.yaml

# Verify all CRDs including experimental ones
kubectl get crd | grep gateway.networking.k8s.io
```

The experimental channel includes everything from standard plus additional resources like TCPRoute, UDPRoute, and TLSRoute.

## Installing Specific CRD Versions

Pin to specific versions for production stability.

```bash
# Install a specific version
VERSION=v1.0.0
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/${VERSION}/standard-install.yaml

# Check installed version
kubectl get crd gateways.gateway.networking.k8s.io -o jsonpath='{.spec.versions[*].name}'
```

Always test new versions in non-production environments before upgrading production clusters.

## Verifying CRD Installation

Confirm that all expected CRDs are installed and healthy.

```bash
# List all Gateway API CRDs
kubectl get crd | grep gateway.networking.k8s.io

# Expected CRDs (standard channel):
# gatewayclasses.gateway.networking.k8s.io
# gateways.gateway.networking.k8s.io
# httproutes.gateway.networking.k8s.io
# referencegrants.gateway.networking.k8s.io

# Check CRD details
kubectl describe crd gateways.gateway.networking.k8s.io

# Verify CRD is established
kubectl get crd gateways.gateway.networking.k8s.io -o jsonpath='{.status.conditions[?(@.type=="Established")].status}'
```

All CRDs should show "Established" status with "True" value.

## Installing Using Helm

For GitOps workflows, install CRDs through Helm charts.

```yaml
# gateway-api-crds-chart/Chart.yaml
apiVersion: v2
name: gateway-api-crds
version: 1.0.0
description: Gateway API CRDs

# gateway-api-crds-chart/values.yaml
channel: standard  # or experimental
version: v1.0.0

# gateway-api-crds-chart/templates/crds.yaml
{{- if eq .Values.channel "standard" }}
apiVersion: v1
kind: List
items:
  - apiVersion: apiextensions.k8s.io/v1
    kind: CustomResourceDefinition
    metadata:
      name: gatewayclasses.gateway.networking.k8s.io
    spec:
      # CRD spec here
{{- end }}
```

Install via Helm:

```bash
helm install gateway-api-crds ./gateway-api-crds-chart
```

## Upgrading Gateway API CRDs

Upgrade CRDs carefully to avoid breaking existing resources.

```bash
# Check current version
kubectl get crd gateways.gateway.networking.k8s.io -o yaml | grep "gateway.networking.k8s.io/bundle-version"

# Download new version
wget https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/standard-install.yaml

# Review changes
diff <(kubectl get crd gateways.gateway.networking.k8s.io -o yaml) <(grep -A 1000 "kind: CustomResourceDefinition" standard-install.yaml | head -n 500)

# Apply upgrade
kubectl apply -f standard-install.yaml

# Verify existing resources still work
kubectl get gateways -A
kubectl get httproutes -A
```

CRD upgrades typically preserve existing resources through conversion webhooks.

## Installing With ArgoCD

Manage Gateway API CRDs through ArgoCD for declarative GitOps.

```yaml
# argocd/gateway-api-crds.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: gateway-api-crds
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://github.com/kubernetes-sigs/gateway-api
    targetRevision: v1.0.0
    path: config/crd/standard
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: false  # Don't auto-delete CRDs
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

Apply the ArgoCD application:

```bash
kubectl apply -f argocd/gateway-api-crds.yaml
```

## Handling CRD Conflicts

Resolve conflicts when multiple versions are installed.

```bash
# Check for conflicting CRD versions
kubectl get crd gateways.gateway.networking.k8s.io -o jsonpath='{.spec.versions[*].name}'

# Remove old CRD version if needed (DANGEROUS - backup first)
kubectl get gateways -A -o yaml > gateways-backup.yaml
kubectl delete crd gateways.gateway.networking.k8s.io

# Reinstall correct version
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml

# Restore resources
kubectl apply -f gateways-backup.yaml
```

Always backup resources before deleting CRDs.

## Installing for Multi-Tenancy

Configure RBAC for multi-tenant Gateway API usage.

```yaml
# rbac-gateway-api.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: gateway-api-reader
rules:
  - apiGroups: ["gateway.networking.k8s.io"]
    resources: ["gatewayclasses", "gateways", "httproutes"]
    verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: gateway-api-writer
rules:
  - apiGroups: ["gateway.networking.k8s.io"]
    resources: ["httproutes", "referencegrants"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["gateway.networking.k8s.io"]
    resources: ["gateways"]
    verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: gateway-api-tenant-developers
subjects:
  - kind: Group
    name: developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: gateway-api-writer
  apiGroup: rbac.authorization.k8s.io
```

Apply RBAC policies:

```bash
kubectl apply -f rbac-gateway-api.yaml
```

## Validating CRD Schemas

Test that CRD validation works correctly.

```yaml
# test-invalid-gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: test-gateway
  namespace: default
spec:
  gatewayClassName: invalid-class
  listeners:
    - name: http
      protocol: INVALID  # Invalid protocol
      port: 80
```

Apply and verify validation:

```bash
# Should fail with validation error
kubectl apply -f test-invalid-gateway.yaml

# Expected error about invalid protocol
# Error: ...protocol: Unsupported value: "INVALID"...
```

## Checking Gateway API Compatibility

Verify that your cluster version supports Gateway API.

```bash
# Check Kubernetes version
kubectl version --short

# Gateway API v1.0 requires Kubernetes 1.23+
# Verify CustomResourceDefinition v1 is available
kubectl api-resources | grep customresourcedefinitions

# Check if conversion webhooks are supported
kubectl get apiservice | grep apiextensions
```

## Monitoring CRD Health

Set up monitoring for Gateway API CRD health.

```yaml
# prometheus-rule.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: gateway-api-crds
spec:
  groups:
    - name: gateway-api
      interval: 30s
      rules:
        - alert: GatewayAPICRDNotEstablished
          expr: |
            kube_customresourcedefinition_status_condition{
              customresourcedefinition=~".*gateway.networking.k8s.io",
              condition="Established",
              status="false"
            } == 1
          for: 5m
          annotations:
            summary: "Gateway API CRD not established"
            description: "CRD {{ $labels.customresourcedefinition }} is not established"
```

## Uninstalling Gateway API CRDs

Remove Gateway API CRDs when no longer needed.

```bash
# WARNING: This deletes all Gateway API resources
# Backup first
kubectl get gateways -A -o yaml > gateways-backup.yaml
kubectl get httproutes -A -o yaml > httproutes-backup.yaml

# List all Gateway API resources
kubectl get gateways,httproutes,gatewayclasses -A

# Delete CRDs (this cascades to delete all resources)
kubectl delete -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml

# Verify removal
kubectl get crd | grep gateway.networking.k8s.io
```

## Best Practices for CRD Management

Always install CRDs before installing gateway controllers. Controllers expect CRDs to exist.

Use the standard channel for production unless you specifically need experimental features.

Pin to specific versions rather than using latest to ensure reproducible deployments.

Test CRD upgrades in non-production environments first to catch breaking changes.

Document which CRD version each environment runs to track upgrade progress.

Set up monitoring for CRD health to catch issues early.

Include CRD installation in your cluster bootstrap process to ensure consistency across clusters.

Use GitOps tools like ArgoCD or Flux to manage CRD lifecycles declaratively.

Review Gateway API release notes before upgrading to understand changes and deprecations.

Keep CRDs in sync across clusters in the same environment to prevent configuration drift.

Installing Gateway API CRDs is the foundation for modern ingress management in Kubernetes. While the process is straightforward, careful version management and testing ensure smooth operation as the API continues to evolve.
