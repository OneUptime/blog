# How to Deploy Dapr with Crossplane

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Crossplane, Kubernetes, Infrastructure as Code, GitOps

Description: Use Crossplane's Helm provider to declare Dapr installations as Kubernetes-native resources, enabling GitOps-friendly, operator-managed deployments.

---

## Crossplane and Dapr: A Natural Fit

Crossplane extends Kubernetes with the ability to provision and manage infrastructure using the Kubernetes API. By combining Crossplane's Helm provider with Dapr, you can declare your Dapr installation as a custom Kubernetes resource - making it subject to the same GitOps workflows as your applications.

## Installing Crossplane

```bash
# Add Crossplane Helm repo
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm repo update

# Install Crossplane
helm install crossplane \
  crossplane-stable/crossplane \
  --namespace crossplane-system \
  --create-namespace
```

## Installing the Helm Provider

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-helm
spec:
  package: xpkg.upbound.io/crossplane-contrib/provider-helm:v0.17.0
```

```bash
kubectl apply -f provider-helm.yaml

# Wait for provider to be healthy
kubectl get providers
```

## Configuring the Helm Provider

Create a ProviderConfig that gives Crossplane access to your cluster:

```yaml
apiVersion: helm.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: helm-provider-config
spec:
  credentials:
    source: InjectedIdentity
```

```bash
kubectl apply -f provider-config.yaml
```

## Declaring Dapr as a Crossplane Release

```yaml
apiVersion: helm.crossplane.io/v1beta1
kind: Release
metadata:
  name: dapr
spec:
  forProvider:
    chart:
      name: dapr
      repository: https://dapr.github.io/helm-charts/
      version: "1.13.0"
    namespace: dapr-system
    skipCreateNamespace: false
    values:
      global:
        mtls:
          enabled: true
        logAsJson: true
      dapr_operator:
        replicaCount: 2
      dapr_sentry:
        replicaCount: 2
  providerConfigRef:
    name: helm-provider-config
```

```bash
kubectl apply -f dapr-release.yaml

# Monitor the release status
kubectl get release dapr
kubectl describe release dapr
```

## Creating a Composite Resource for Dapr

Define a Crossplane Composition to bundle Dapr with its required components:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xdaprinstallations.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: XDaprInstallation
    plural: xdaprinstallations
  claimNames:
    kind: DaprInstallation
    plural: daprinstallations
  versions:
  - name: v1alpha1
    served: true
    referenceable: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              environment:
                type: string
                enum: [dev, staging, production]
              daprVersion:
                type: string
```

## Reconciliation and Drift Detection

Crossplane continuously reconciles the desired state. If someone manually modifies the Dapr installation, Crossplane will detect drift and restore the declared configuration:

```bash
# Trigger a reconciliation by updating an annotation
kubectl annotate release dapr reconcile.crossplane.io/timestamp="$(date +%s)" --overwrite

# Check reconciliation events
kubectl get events --field-selector involvedObject.name=dapr
```

## Summary

Deploying Dapr with Crossplane transforms your Dapr installation into a first-class Kubernetes resource, enabling full GitOps workflows, drift detection, and composition with other infrastructure resources. This approach is particularly powerful in platform engineering contexts where platform teams need to offer self-service Dapr installations to application teams.
