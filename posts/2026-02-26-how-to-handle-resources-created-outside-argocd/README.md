# How to Handle Resources Created Outside ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Drift Detection

Description: Learn how to handle Kubernetes resources created outside ArgoCD, including orphaned resource detection, adoption strategies, and methods to prevent GitOps drift.

---

One of the most common challenges in a GitOps environment is dealing with Kubernetes resources that were created outside of ArgoCD. Maybe someone ran `kubectl apply` directly, a Helm install was done outside of GitOps, or a controller created resources that ArgoCD does not know about. These orphaned or unmanaged resources create drift between your desired state in Git and the actual state in the cluster. This guide covers strategies for detecting, managing, and resolving this situation.

## Understanding the Problem

ArgoCD tracks resources it manages using a tracking annotation by default (`argocd.argoproj.io/tracking-id`), or a tracking label when `application.resourceTrackingMethod: label` is configured in `argocd-cm`. The label key can be customized with `application.instanceLabelKey`. Resources that were created by other means - kubectl, Helm CLI, operators, or other controllers - do not have this tracking mechanism. This creates several issues:

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

NAMESPACE="${1:?Usage: $0 <namespace> [tracking-method]}"
TRACKING_METHOD="${2:-annotation}"
TRACKING_LABEL="${3:-app.kubernetes.io/instance}"
TRACKING_ANNOTATION="${4:-argocd.argoproj.io/tracking-id}"

echo "Finding resources in ${NAMESPACE} not managed by ArgoCD..."
echo ""

# Resource types to check
RESOURCE_TYPES="deployments,services,configmaps,secrets,statefulsets,daemonsets,jobs,cronjobs,ingresses,networkpolicies,serviceaccounts,roles,rolebindings,pvc"

for resource_type in $(echo "${RESOURCE_TYPES}" | tr ',' '\n'); do
  UNMANAGED=$(kubectl get "${resource_type}" -n "${NAMESPACE}" -o json 2>/dev/null | \
    jq -r --arg method "${TRACKING_METHOD}" --arg label "${TRACKING_LABEL}" --arg annotation "${TRACKING_ANNOTATION}" \
      '.items[] | select(if $method == "label" then ((.metadata.labels[$label] // "") == "") else ((.metadata.annotations[$annotation] // "") == "") end) | .metadata.name' 2>/dev/null || true)

  if [[ -n "${UNMANAGED}" ]]; then
    echo "${resource_type}:"
    echo "${UNMANAGED}" | while read -r name; do
      # Check creation info
      CREATED=$(kubectl get "${resource_type}" "${name}" -n "${NAMESPACE}" -o jsonpath='{.metadata.creationTimestamp}' 2>/dev/null)
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

### Add the Tracking Metadata

After adding the resource to Git, ArgoCD will detect it during the next sync. However, if the resource differs from what is in Git, ArgoCD will try to reconcile. To adopt without changes, make sure the Git version matches the current state exactly, or pre-add the tracking annotation. Manually constructing tracking annotations can be useful during migration, but the long-term supported approach is to manage the resource from Git:

```bash
# Add ArgoCD tracking annotation manually
kubectl annotate deployment my-legacy-app -n my-namespace \
  "argocd.argoproj.io/tracking-id=my-app:apps/Deployment:my-namespace/my-legacy-app" \
  --overwrite
```

### Using argocd app sync with Replace

For resources that cannot be updated cleanly with the default apply behavior:

```bash
argocd app sync my-app --force --replace
```

Be careful with `--replace` as it uses `kubectl replace` or `kubectl create` rather than `kubectl apply`. Combined with `--force`, this can be destructive because resources may be deleted and recreated.

## Strategy 2: Exclude Resources from ArgoCD Comparison or Discovery

If resources should continue to exist but are not ArgoCD's responsibility, use the right exclusion mechanism for the situation:

### Using ignoreDifferences

Tell ArgoCD to ignore specific fields on resources that are part of the Application:

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

Globally exclude certain resource types from ArgoCD discovery and sync:

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

On individual resources generated by a tool, you can keep extraneous resources from affecting the Application's overall sync status:

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
TRACKING_METHOD="${TRACKING_METHOD:-annotation}"
TRACKING_LABEL="app.kubernetes.io/instance"
TRACKING_ANNOTATION="argocd.argoproj.io/tracking-id"
DRY_RUN="${DRY_RUN:-true}"

echo "Cleaning up orphaned resources in ${NAMESPACE}"
echo "DRY_RUN: ${DRY_RUN}"
echo ""

RESOURCE_TYPES="deployments,services,configmaps,secrets,ingresses"

for resource_type in $(echo "${RESOURCE_TYPES}" | tr ',' '\n'); do
  ORPHANED=$(kubectl get "${resource_type}" -n "${NAMESPACE}" -o json | \
    jq -r --arg method "${TRACKING_METHOD}" --arg label "${TRACKING_LABEL}" --arg annotation "${TRACKING_ANNOTATION}" \
      '.items[] | select(if $method == "label" then ((.metadata.labels[$label] // "") == "") else ((.metadata.annotations[$annotation] // "") == "") end) | .metadata.name')

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
```

### Use Policy Engines

Deploy OPA Gatekeeper or Kyverno to enforce that resources carry ArgoCD tracking metadata:

```yaml
# Kyverno policy to require ArgoCD tracking annotation
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-argocd-tracking
spec:
  rules:
    - name: check-argocd-annotation
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - Service
                - ConfigMap
              namespaces:
                - "app-*"
      exclude:
        any:
          - resources:
              namespaces:
                - kube-system
                - argocd
      validate:
        failureAction: Audit    # Change to Enforce when ready
        message: "Resources in managed namespaces must be deployed through ArgoCD"
        pattern:
          metadata:
            annotations:
              argocd.argoproj.io/tracking-id: "?*"
```

## Handling Operator-Created Resources

Kubernetes operators often create resources dynamically. These are legitimate but outside ArgoCD's control:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  ignoreDifferences:
    # Ignore fields changed by operators on resources in this Application
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
