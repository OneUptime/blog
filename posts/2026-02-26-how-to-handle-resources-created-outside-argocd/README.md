# How to Handle Resources Created Outside ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Drift Detection

Description: Learn how to handle Kubernetes resources created outside ArgoCD, including orphaned resource detection, adoption strategies, and methods to prevent GitOps drift.

---

One of the most common challenges in a GitOps environment is dealing with Kubernetes resources that were created outside of ArgoCD. Maybe someone ran `kubectl apply` directly, a Helm install was done outside of GitOps, or a controller created resources that ArgoCD does not know about. These orphaned or unmanaged resources create drift between your desired state in Git and the actual state in the cluster. This guide covers strategies for detecting, managing, and resolving this situation.

## Understanding the Problem

ArgoCD tracks resources it manages using a tracking label or annotation (configured via `application.instanceLabelKey` in argocd-cm). Resources that were created by other means - kubectl, Helm CLI, operators, or other controllers - do not have this tracking mechanism. This creates several issues:

- ArgoCD is unaware of these resources and cannot manage their lifecycle
- The resources may conflict with ArgoCD-managed resources
- Namespace contents diverge from what Git says should be there
- Cleanup becomes difficult because nobody owns the resources

## Detecting Orphaned Resources

### Enable Orphaned Resource Monitoring

ArgoCD can detect resources in its managed namespaces that are not tracked by any Application. Enable this in the AppProject:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: my-project
  namespace: argocd
spec:
  orphanedResources:
    warn: true
    ignore:
      # Ignore resources that are expected to exist outside ArgoCD
      - group: ""
        kind: ConfigMap
        name: "kube-root-ca.crt"
      - group: ""
        kind: ServiceAccount
        name: "default"
      - group: ""
        kind: Secret
        name: "default-token-*"
      - group: ""
        kind: Endpoints
```

With `warn: true`, the ArgoCD UI shows a warning indicator on applications in namespaces that contain orphaned resources.

### Script to Find Unmanaged Resources

Here is a script that identifies resources in a namespace that ArgoCD does not manage:

```bash
#!/bin/bash
# find-orphaned-resources.sh - Find resources not managed by ArgoCD
set -euo pipefail

NAMESPACE="${1:?Usage: $0 <namespace>}"
TRACKING_LABEL="${2:-app.kubernetes.io/instance}"

echo "Finding resources in ${NAMESPACE} not managed by ArgoCD..."
echo ""

# Resource types to check
RESOURCE_TYPES="deployments,services,configmaps,secrets,statefulsets,daemonsets,jobs,cronjobs,ingresses,networkpolicies,serviceaccounts,roles,rolebindings,pvc"

for resource_type in $(echo "${RESOURCE_TYPES}" | tr ',' '\n'); do
  UNMANAGED=$(kubectl get "${resource_type}" -n "${NAMESPACE}" -o json 2>/dev/null | \
    jq -r ".items[] | select(.metadata.labels.\"${TRACKING_LABEL}\" == null) | .metadata.name" 2>/dev/null || true)

  if [[ -n "${UNMANAGED}" ]]; then
    echo "${resource_type}:"
    echo "${UNMANAGED}" | while read -r name; do
      # Check creation info
      CREATED=$(kubectl get "${resource_type}" "${name}" -n "${NAMESPACE}" -o jsonpath='{.metadata.creationTimestamp}' 2>/dev/null)
      CREATOR=$(kubectl get "${resource_type}" "${name}" -n "${NAMESPACE}" -o jsonpath='{.metadata.annotations.kubectl\.kubernetes\.io/last-applied-configuration}' 2>/dev/null | jq -r '.metadata.name' 2>/dev/null || echo "unknown")
      echo "  - ${name} (created: ${CREATED})"
    done
    echo ""
  fi
done
```

## Strategy 1: Adopt Resources into ArgoCD

If the resources should be managed by ArgoCD going forward, you need to adopt them.

### Add Resources to Git

The simplest adoption approach: add the resource manifests to your Git repository and let ArgoCD manage them.

```bash
# Export the existing resource
kubectl get deployment my-legacy-app -n my-namespace -o yaml > exported-deployment.yaml

# Clean up Kubernetes metadata that should not be committed
cat exported-deployment.yaml | \
  yq 'del(.metadata.resourceVersion, .metadata.uid, .metadata.generation,
          .metadata.creationTimestamp, .metadata.managedFields,
          .status)' > clean-deployment.yaml

# Add to your Git repository
cp clean-deployment.yaml /path/to/gitops-repo/apps/my-namespace/deployment.yaml
```

### Add the Tracking Label

After adding the resource to Git, ArgoCD will detect it during the next sync. However, if the resource differs from what is in Git, ArgoCD will try to reconcile. To adopt without changes, make sure the Git version matches the current state exactly, or use `kubectl label` to pre-add the tracking annotation:

```bash
# Add ArgoCD tracking annotation manually
kubectl annotate deployment my-legacy-app -n my-namespace \
  "argocd.argoproj.io/tracking-id=my-app:apps/Deployment:my-namespace/my-legacy-app" \
  --overwrite
```

### Using argocd app sync with Replace

For resources that resist adoption due to field manager conflicts:

```bash
argocd app sync my-app --force --replace
```

Be careful with `--replace` as it performs a full resource replacement rather than a patch.

## Strategy 2: Exclude Resources from ArgoCD Tracking

If resources should continue to exist but are not ArgoCD's responsibility, exclude them:

### Using ignoreDifferences

Tell ArgoCD to ignore specific resources or fields:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  ignoreDifferences:
    - group: ""
      kind: ConfigMap
      name: externally-managed-config
      jsonPointers:
        - /data
    - group: apps
      kind: Deployment
      name: operator-managed-deployment
      jqPathExpressions:
        - .spec.replicas
```

### Using Resource Exclusion

Globally exclude certain resource types from ArgoCD tracking:

```yaml
# In argocd-cm ConfigMap
data:
  resource.exclusions: |
    - apiGroups:
        - "autoscaling.k8s.io"
      kinds:
        - "VerticalPodAutoscaler"
      clusters:
        - "*"
    - apiGroups:
        - ""
      kinds:
        - "Event"
      clusters:
        - "*"
```

### Using the argocd.argoproj.io/compare-options Annotation

On individual resources, you can opt out of comparison:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: externally-managed
  annotations:
    argocd.argoproj.io/compare-options: IgnoreExtraneous
```

## Strategy 3: Clean Up Orphaned Resources

If the resources should not exist, remove them:

```bash
#!/bin/bash
# cleanup-orphaned.sh - Remove resources not managed by ArgoCD
set -euo pipefail

NAMESPACE="${1:?Usage: $0 <namespace>}"
TRACKING_LABEL="app.kubernetes.io/instance"
DRY_RUN="${DRY_RUN:-true}"

echo "Cleaning up orphaned resources in ${NAMESPACE}"
echo "DRY_RUN: ${DRY_RUN}"
echo ""

RESOURCE_TYPES="deployments,services,configmaps,secrets,ingresses"

for resource_type in $(echo "${RESOURCE_TYPES}" | tr ',' '\n'); do
  ORPHANED=$(kubectl get "${resource_type}" -n "${NAMESPACE}" -o json | \
    jq -r ".items[] | select(.metadata.labels.\"${TRACKING_LABEL}\" == null) | .metadata.name")

  for name in ${ORPHANED}; do
    # Skip known system resources
    case "${name}" in
      default|kube-root-ca.crt|default-token-*)
        continue
        ;;
    esac

    if [[ "${DRY_RUN}" == "true" ]]; then
      echo "  Would delete ${resource_type}/${name}"
    else
      echo "  Deleting ${resource_type}/${name}"
      kubectl delete "${resource_type}" "${name}" -n "${NAMESPACE}"
    fi
  done
done
```

## Strategy 4: Prevent Out-of-Band Changes

The best long-term solution is preventing out-of-band resource creation:

### Enable Self-Heal

ArgoCD self-heal automatically reverts manual changes:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
```

### Use RBAC to Restrict kubectl Access

Limit who can create resources directly in ArgoCD-managed namespaces:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: restricted-access
  namespace: my-namespace
rules:
  # Only allow read access
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  # Deny create, update, delete
```

### Use Policy Engines

Deploy OPA Gatekeeper or Kyverno to enforce that all resources must have ArgoCD tracking labels:

```yaml
# Kyverno policy to require ArgoCD tracking
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-argocd-tracking
spec:
  validationFailureAction: Audit    # Change to Enforce when ready
  rules:
    - name: check-argocd-label
      match:
        resources:
          kinds:
            - Deployment
            - Service
            - ConfigMap
          namespaces:
            - "app-*"
      exclude:
        resources:
          namespaces:
            - kube-system
            - argocd
      validate:
        message: "Resources in managed namespaces must be deployed through ArgoCD"
        pattern:
          metadata:
            labels:
              app.kubernetes.io/instance: "?*"
```

## Handling Operator-Created Resources

Kubernetes operators often create resources dynamically. These are legitimate but outside ArgoCD's control:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  ignoreDifferences:
    # Ignore operator-managed resources
    - group: ""
      kind: Secret
      jsonPointers:
        - /data
      managedFieldsManagers:
        - cert-manager-controller
    - group: ""
      kind: Service
      jqPathExpressions:
        - .spec.clusterIP
        - .spec.clusterIPs
```

## Summary

Resources created outside ArgoCD are an inevitable reality in most Kubernetes environments. The key is having a strategy: detect orphaned resources through project-level monitoring, adopt valuable resources by adding them to Git, exclude intentionally unmanaged resources, and clean up true orphans. Long term, enforce GitOps discipline through RBAC restrictions and policy engines that prevent out-of-band changes. The `orphanedResources` setting in AppProject is your first line of defense for visibility into what is happening outside your GitOps workflow.
