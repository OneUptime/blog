# How to Use Helm Hooks with Istio Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Helm, Helm Hooks, Kubernetes, Automation

Description: Learn how to use Helm hooks to automate pre-install checks, post-install validation, upgrade migrations, and cleanup tasks during Istio Helm chart lifecycle operations.

---

Helm hooks let you run actions at specific points during a release lifecycle: before install, after install, before upgrade, after upgrade, and so on. When managing Istio with Helm, hooks are really useful for automating validation, migration tasks, and health checks that you'd otherwise have to do manually.

Istio's own Helm charts already include some hooks internally, but you can add your own to customize the installation workflow for your environment.

## How Helm Hooks Work

Helm hooks are regular Kubernetes resources (usually Jobs or Pods) with special annotations that tell Helm when to run them:

```yaml
annotations:
  "helm.sh/hook": pre-install
  "helm.sh/hook-weight": "0"
  "helm.sh/hook-delete-policy": hook-succeeded
```

The available hook types are:
- `pre-install` - Run before any resources are installed
- `post-install` - Run after all resources are installed
- `pre-upgrade` - Run before any resources are upgraded
- `post-upgrade` - Run after all resources are upgraded
- `pre-delete` - Run before any resources are deleted
- `post-delete` - Run after all resources are deleted
- `pre-rollback` - Run before a rollback
- `post-rollback` - Run after a rollback

## Pre-Install: Cluster Readiness Check

Before installing Istio, verify that the cluster meets the requirements:

```yaml
# templates/pre-install-check.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: istio-pre-install-check
  namespace: {{ .Release.Namespace }}
  annotations:
    "helm.sh/hook": pre-install
    "helm.sh/hook-weight": "-10"
    "helm.sh/hook-delete-policy": hook-succeeded,hook-failed
spec:
  backoffLimit: 0
  template:
    spec:
      serviceAccountName: istio-pre-check
      restartPolicy: Never
      containers:
        - name: check
          image: bitnami/kubectl:latest
          command:
            - /bin/bash
            - -c
            - |
              echo "=== Istio Pre-Install Checks ==="

              # Check Kubernetes version
              K8S_VERSION=$(kubectl version -o json | python3 -c "import json,sys; print(json.load(sys.stdin)['serverVersion']['minor'])")
              echo "Kubernetes minor version: $K8S_VERSION"
              if [ "$K8S_VERSION" -lt 25 ]; then
                echo "ERROR: Kubernetes 1.25+ required"
                exit 1
              fi

              # Check for existing Istio installation
              if kubectl get crd virtualservices.networking.istio.io > /dev/null 2>&1; then
                echo "WARNING: Istio CRDs already exist"
              fi

              # Check node resources
              NODES=$(kubectl get nodes --no-headers | wc -l)
              echo "Cluster nodes: $NODES"
              if [ "$NODES" -lt 2 ]; then
                echo "WARNING: Running on single node. Not recommended for production."
              fi

              # Check namespace doesn't have conflicting resources
              if kubectl get pods -n istio-system --no-headers 2>/dev/null | grep -q .; then
                echo "WARNING: Existing pods in istio-system namespace"
              fi

              echo "=== Pre-install checks passed ==="
```

Create the RBAC for the check job:

```yaml
# templates/pre-install-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: istio-pre-check
  namespace: {{ .Release.Namespace }}
  annotations:
    "helm.sh/hook": pre-install
    "helm.sh/hook-weight": "-20"
    "helm.sh/hook-delete-policy": hook-succeeded,hook-failed
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-pre-check
  annotations:
    "helm.sh/hook": pre-install
    "helm.sh/hook-weight": "-20"
    "helm.sh/hook-delete-policy": hook-succeeded,hook-failed
rules:
  - apiGroups: [""]
    resources: ["nodes", "pods", "namespaces"]
    verbs: ["get", "list"]
  - apiGroups: ["apiextensions.k8s.io"]
    resources: ["customresourcedefinitions"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: istio-pre-check
  annotations:
    "helm.sh/hook": pre-install
    "helm.sh/hook-weight": "-20"
    "helm.sh/hook-delete-policy": hook-succeeded,hook-failed
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: istio-pre-check
subjects:
  - kind: ServiceAccount
    name: istio-pre-check
    namespace: {{ .Release.Namespace }}
```

## Post-Install: Validation Hook

After Istio is installed, run validation to make sure everything is working:

```yaml
# templates/post-install-validate.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: istio-post-install-validate
  namespace: {{ .Release.Namespace }}
  annotations:
    "helm.sh/hook": post-install
    "helm.sh/hook-weight": "10"
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  backoffLimit: 3
  template:
    spec:
      serviceAccountName: istio-validator
      restartPolicy: Never
      containers:
        - name: validate
          image: istio/istioctl:{{ .Values.istioVersion }}
          command:
            - /bin/bash
            - -c
            - |
              echo "=== Post-Install Validation ==="

              # Wait for Istiod to be ready
              echo "Waiting for Istiod..."
              kubectl wait --for=condition=ready pod -l app=istiod \
                -n istio-system --timeout=120s

              # Check proxy status
              echo "Checking proxy status..."
              istioctl proxy-status

              # Run analysis
              echo "Running istioctl analyze..."
              istioctl analyze --all-namespaces

              # Verify webhooks
              echo "Checking webhooks..."
              kubectl get mutatingwebhookconfigurations | grep istio
              kubectl get validatingwebhookconfigurations | grep istio

              echo "=== Validation Complete ==="
```

## Pre-Upgrade: Configuration Backup Hook

Before upgrading, automatically back up the current configuration:

```yaml
# templates/pre-upgrade-backup.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: istio-pre-upgrade-backup-{{ now | date "20060102150405" }}
  namespace: {{ .Release.Namespace }}
  annotations:
    "helm.sh/hook": pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  backoffLimit: 1
  template:
    spec:
      serviceAccountName: istio-backup-hook
      restartPolicy: Never
      containers:
        - name: backup
          image: bitnami/kubectl:latest
          command:
            - /bin/bash
            - -c
            - |
              echo "=== Pre-Upgrade Configuration Backup ==="

              BACKUP_NS="istio-backup"
              kubectl create namespace "$BACKUP_NS" 2>/dev/null || true

              # Backup all Istio resources to a ConfigMap
              RESOURCES="virtualservices destinationrules gateways serviceentries authorizationpolicies peerauthentications"

              BACKUP_DATA=""
              for resource in $RESOURCES; do
                DATA=$(kubectl get "$resource" --all-namespaces -o yaml 2>/dev/null)
                if [ -n "$DATA" ]; then
                  BACKUP_DATA="$BACKUP_DATA\n---\n$DATA"
                fi
              done

              # Store as a ConfigMap (note: limited to 1MB)
              kubectl create configmap "istio-backup-$(date +%Y%m%d%H%M%S)" \
                -n "$BACKUP_NS" \
                --from-literal=timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                --from-literal=version="{{ .Chart.AppVersion }}"

              echo "Backup stored in $BACKUP_NS namespace"
              echo "=== Backup Complete ==="
```

## Post-Upgrade: Health Check Hook

After upgrading, verify that everything is healthy:

```yaml
# templates/post-upgrade-health.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: istio-post-upgrade-health
  namespace: {{ .Release.Namespace }}
  annotations:
    "helm.sh/hook": post-upgrade
    "helm.sh/hook-weight": "10"
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  backoffLimit: 3
  activeDeadlineSeconds: 300
  template:
    spec:
      serviceAccountName: istio-health-check
      restartPolicy: Never
      containers:
        - name: health-check
          image: bitnami/kubectl:latest
          command:
            - /bin/bash
            - -c
            - |
              echo "=== Post-Upgrade Health Check ==="

              # Wait for new Istiod pods to be ready
              echo "Waiting for Istiod rollout..."
              kubectl rollout status deployment/istiod -n istio-system --timeout=120s

              if [ $? -ne 0 ]; then
                echo "ERROR: Istiod rollout failed!"
                kubectl get pods -n istio-system
                exit 1
              fi

              # Check for error logs
              sleep 10
              ERROR_COUNT=$(kubectl logs deploy/istiod -n istio-system --since=60s 2>/dev/null | grep -c -i "error")
              echo "Errors in last 60s: $ERROR_COUNT"

              if [ "$ERROR_COUNT" -gt 20 ]; then
                echo "WARNING: High error count in Istiod logs"
                kubectl logs deploy/istiod -n istio-system --since=60s | grep -i "error" | tail -10
              fi

              # Check connected proxies
              CONNECTED=$(kubectl exec -n istio-system deploy/istiod -- \
                curl -s localhost:15014/metrics 2>/dev/null | \
                grep "pilot_xds_connected" | tail -1)
              echo "Connected proxies: $CONNECTED"

              echo "=== Health Check Complete ==="
```

## Pre-Delete: Cleanup Hook

Before uninstalling Istio, clean up gracefully:

```yaml
# templates/pre-delete-cleanup.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: istio-pre-delete-cleanup
  namespace: {{ .Release.Namespace }}
  annotations:
    "helm.sh/hook": pre-delete
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": hook-succeeded,hook-failed
spec:
  backoffLimit: 0
  template:
    spec:
      serviceAccountName: istio-cleanup
      restartPolicy: Never
      containers:
        - name: cleanup
          image: bitnami/kubectl:latest
          command:
            - /bin/bash
            - -c
            - |
              echo "=== Pre-Delete Cleanup ==="

              # Remove namespace injection labels
              for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
                echo "Removing injection label from $ns"
                kubectl label namespace "$ns" istio-injection-
              done

              # Remove revision labels
              for ns in $(kubectl get namespaces -l istio.io/rev -o jsonpath='{.items[*].metadata.name}'); do
                echo "Removing revision label from $ns"
                kubectl label namespace "$ns" istio.io/rev-
              done

              echo "=== Cleanup Complete ==="
              echo "NOTE: Existing sidecars will remain until pods are restarted"
```

## Creating a Wrapper Chart

The clean way to add hooks to your Istio installation is to create a wrapper Helm chart that depends on the official Istio charts:

```yaml
# Chart.yaml
apiVersion: v2
name: istio-managed
description: Istio installation with custom hooks
version: 1.0.0
dependencies:
  - name: base
    version: "1.24.0"
    repository: https://istio-release.storage.googleapis.com/charts
  - name: istiod
    version: "1.24.0"
    repository: https://istio-release.storage.googleapis.com/charts
```

Put your hook templates in the `templates/` directory of this wrapper chart.

Build dependencies and install:

```bash
helm dependency build
helm install istio-managed . -n istio-system --create-namespace
```

## Hook Weight Ordering

When you have multiple hooks at the same lifecycle point, use weights to control the order:

```
Weight -20: RBAC resources (ServiceAccount, ClusterRole, etc.)
Weight -10: Pre-checks and validation
Weight  -5: Backups
Weight   0: Default (main hook actions)
Weight   5: Configuration tasks
Weight  10: Health checks and verification
```

Lower weights run first. Use negative weights for things that need to happen before the main hooks.

## Hook Delete Policies

Control what happens to hook resources after they run:

```yaml
annotations:
  # Delete when the hook succeeds
  "helm.sh/hook-delete-policy": hook-succeeded

  # Delete when the hook fails
  "helm.sh/hook-delete-policy": hook-failed

  # Delete both cases
  "helm.sh/hook-delete-policy": hook-succeeded,hook-failed

  # Delete before the next hook runs
  "helm.sh/hook-delete-policy": before-hook-creation
```

For debugging, you might want to keep failed hooks around so you can inspect the logs:

```yaml
annotations:
  "helm.sh/hook-delete-policy": hook-succeeded
  # Failed jobs stay for inspection
```

## Practical Tips

A few lessons from using hooks with Istio in production:

Keep hooks lightweight. They run synchronously, and Helm waits for them to complete before continuing. A hook that takes 10 minutes to run means your install/upgrade takes 10 minutes longer.

Set `activeDeadlineSeconds` on your hook Jobs to prevent them from hanging forever:

```yaml
spec:
  activeDeadlineSeconds: 120
```

Use `backoffLimit: 0` for pre-install checks that should fail the installation if they don't pass. Use `backoffLimit: 3` for post-install validations that might just need a retry.

Always include proper RBAC. Hook jobs need permissions to interact with the cluster, and those permissions should be scoped as narrowly as possible.

Helm hooks are a powerful way to build safety and automation into your Istio deployment workflow. They turn manual checklist items into automated gates that run every time, making your Istio operations more reliable and consistent.
