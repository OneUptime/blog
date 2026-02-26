# How to Handle Auto-Generated Kubernetes Resources in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Configuration

Description: Learn how to handle auto-generated Kubernetes resources like Endpoints, ReplicaSets, and controller-created objects in ArgoCD without causing perpetual OutOfSync states.

---

Kubernetes generates resources automatically all the time. When you create a Service, Kubernetes generates Endpoints. When you create a Deployment, it creates ReplicaSets. Controllers create Secrets, ConfigMaps, and custom resources. These auto-generated resources create headaches in ArgoCD because they exist in the cluster but not in Git, causing confusing diff outputs and OutOfSync states. This guide explains how to handle every common type of auto-generated resource.

## Why Auto-Generated Resources Cause Problems

ArgoCD compares what is in Git (desired state) with what is in the cluster (live state). Auto-generated resources create mismatches in two ways:

1. **Resources exist in the cluster that are not in Git** - ArgoCD may flag them as orphaned or try to prune them
2. **Fields on managed resources have server-set values** - Kubernetes adds default values, status fields, and generated fields that differ from the Git manifests

Both situations can make applications appear perpetually OutOfSync.

## Common Auto-Generated Resources

Here is a reference of what Kubernetes generates automatically and how to handle each type:

### Endpoints and EndpointSlices

Created automatically for every Service:

```yaml
# Problem: Endpoints are auto-generated from Service selectors
# Solution: Exclude from ArgoCD tracking globally

# In argocd-cm ConfigMap
data:
  resource.exclusions: |
    - apiGroups:
        - ""
      kinds:
        - "Endpoints"
      clusters:
        - "*"
    - apiGroups:
        - "discovery.k8s.io"
      kinds:
        - "EndpointSlice"
      clusters:
        - "*"
```

### ReplicaSets

Created by Deployments:

```yaml
# ReplicaSets are managed by Deployment controllers
# ArgoCD already handles this - no action needed for standard Deployments
# But if you see them in diffs, exclude them:

data:
  resource.exclusions: |
    - apiGroups:
        - "apps"
      kinds:
        - "ReplicaSet"
      clusters:
        - "*"
```

Note: ArgoCD is generally smart about ReplicaSets. You should only exclude them if you see specific issues.

### Service Default Fields

Kubernetes adds default fields to Services:

```yaml
# Problem: clusterIP, sessionAffinity, and other defaults are added by the API server
# Solution: Ignore these fields

apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  ignoreDifferences:
    - group: ""
      kind: Service
      jqPathExpressions:
        - .spec.clusterIP
        - .spec.clusterIPs
        - .spec.sessionAffinity
        - .spec.ipFamilies
        - .spec.ipFamilyPolicy
        - .spec.internalTrafficPolicy
```

### ServiceAccount Secrets and Tokens

In Kubernetes versions before 1.24, ServiceAccounts automatically get token Secrets:

```yaml
# Ignore auto-generated ServiceAccount token references
spec:
  ignoreDifferences:
    - group: ""
      kind: ServiceAccount
      jsonPointers:
        - /secrets
        - /imagePullSecrets
```

### Events

Events should always be excluded:

```yaml
data:
  resource.exclusions: |
    - apiGroups:
        - ""
      kinds:
        - "Event"
      clusters:
        - "*"
    - apiGroups:
        - "events.k8s.io"
      kinds:
        - "Event"
      clusters:
        - "*"
```

### cert-manager Generated Secrets

cert-manager creates Certificate Secrets and Order/Challenge resources:

```yaml
data:
  resource.exclusions: |
    - apiGroups:
        - "acme.cert-manager.io"
      kinds:
        - "Order"
        - "Challenge"
      clusters:
        - "*"

# For the generated TLS secrets, use ignoreDifferences:
spec:
  ignoreDifferences:
    - group: ""
      kind: Secret
      jsonPointers:
        - /data
      managedFieldsManagers:
        - cert-manager-certificates-issuing
        - cert-manager-certificates-key-manager
```

### HPA-Managed Replica Count

When using HorizontalPodAutoscaler, the replica count is managed by the HPA controller, not by Git:

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
    - group: apps
      kind: StatefulSet
      jsonPointers:
        - /spec/replicas
```

### Webhook CA Bundles

Mutating and Validating webhook configurations get their CA bundles injected by cert-manager or similar tools:

```yaml
spec:
  ignoreDifferences:
    - group: admissionregistration.k8s.io
      kind: MutatingWebhookConfiguration
      jsonPointers:
        - /webhooks/0/clientConfig/caBundle
        - /webhooks/1/clientConfig/caBundle
    - group: admissionregistration.k8s.io
      kind: ValidatingWebhookConfiguration
      jqPathExpressions:
        - .webhooks[].clientConfig.caBundle
```

### kube-root-ca.crt ConfigMap

Kubernetes automatically creates this ConfigMap in every namespace:

```yaml
data:
  resource.exclusions: |
    - apiGroups:
        - ""
      kinds:
        - "ConfigMap"
      # Only exclude the specific auto-generated one
      # This is too broad - use orphanedResources ignore instead
```

Better approach using orphanedResources:

```yaml
spec:
  orphanedResources:
    warn: true
    ignore:
      - group: ""
        kind: ConfigMap
        name: "kube-root-ca.crt"
```

## Global Exclusion Configuration

Here is a comprehensive global exclusion configuration that handles the most common auto-generated resources:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.exclusions: |
    # Kubernetes Events
    - apiGroups: [""]
      kinds: ["Event"]
      clusters: ["*"]
    - apiGroups: ["events.k8s.io"]
      kinds: ["Event"]
      clusters: ["*"]

    # Endpoints (auto-generated from Services)
    - apiGroups: [""]
      kinds: ["Endpoints"]
      clusters: ["*"]
    - apiGroups: ["discovery.k8s.io"]
      kinds: ["EndpointSlice"]
      clusters: ["*"]

    # cert-manager transient resources
    - apiGroups: ["acme.cert-manager.io"]
      kinds: ["Order", "Challenge"]
      clusters: ["*"]

    # Cilium internal resources
    - apiGroups: ["cilium.io"]
      kinds: ["CiliumIdentity", "CiliumEndpoint"]
      clusters: ["*"]

  # Global ignoreDifferences
  resource.customizations.ignoreDifferences.all: |
    managedFieldsManagers:
      - kube-controller-manager
      - kube-scheduler
    jsonPointers:
      - /metadata/managedFields
```

## Application-Level ignoreDifferences

For application-specific handling, combine multiple ignore rules:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  ignoreDifferences:
    # Service auto-generated fields
    - group: ""
      kind: Service
      jqPathExpressions:
        - .spec.clusterIP
        - .spec.clusterIPs
        - .spec.sessionAffinity

    # HPA-managed replicas
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas

    # Webhook CA injection
    - group: admissionregistration.k8s.io
      kind: MutatingWebhookConfiguration
      jqPathExpressions:
        - .webhooks[].clientConfig.caBundle

    # ServiceAccount tokens
    - group: ""
      kind: ServiceAccount
      jsonPointers:
        - /secrets

  syncPolicy:
    syncOptions:
      # Apply ignoreDifferences during sync, not just diff
      - RespectIgnoreDifferences=true
```

The `RespectIgnoreDifferences=true` sync option is critical. Without it, `ignoreDifferences` only affects the diff display but ArgoCD still tries to sync the ignored fields.

## Handling Operator-Created Resources

Operators create resources dynamically that may appear in ArgoCD-managed namespaces:

```bash
#!/bin/bash
# identify-operator-resources.sh - Find operator-managed resources
NAMESPACE="${1:?Usage: $0 <namespace>}"

echo "Finding operator-managed resources in ${NAMESPACE}..."

kubectl get all -n "${NAMESPACE}" -o json | jq -r '
  .items[] |
  select(.metadata.ownerReferences != null) |
  "\(.kind)/\(.metadata.name) owned by \(.metadata.ownerReferences[0].kind)/\(.metadata.ownerReferences[0].name)"
'
```

For operator-created resources, the best approach is usually to exclude them from ArgoCD tracking since the operator is responsible for their lifecycle.

## Using Server-Side Apply

Server-side apply can help reduce conflicts by letting each manager own specific fields:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  syncPolicy:
    syncOptions:
      - ServerSideApply=true
```

With server-side apply, ArgoCD only manages the fields it explicitly sets. Other controllers can manage their own fields without creating conflicts. This is the most modern and cleanest solution for many auto-generated field issues.

## Summary

Auto-generated Kubernetes resources are a fact of life in any cluster. The key to handling them in ArgoCD is a layered approach: exclude truly irrelevant resources globally (Events, Endpoints), ignore specific auto-generated fields at the application level (clusterIP, replicas), and use server-side apply for the cleanest field ownership model. The `RespectIgnoreDifferences=true` sync option and the `resource.exclusions` configuration in argocd-cm are your two most important tools for preventing perpetual OutOfSync states caused by auto-generated resources.
