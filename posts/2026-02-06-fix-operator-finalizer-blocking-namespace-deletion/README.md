# How to Fix the Operator Finalizer Blocking Namespace Deletion When Cluster RBAC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Operator, Finalizer, Kubernetes

Description: Fix stuck namespace deletions caused by OpenTelemetry Operator finalizers when RBAC permissions are insufficient.

You try to delete a namespace and it gets stuck in the "Terminating" state forever. Running `kubectl get namespace my-namespace -o yaml` shows that namespaced content still exists, and the remaining OpenTelemetry resources may have a finalizer that cannot be removed because the Operator does not have the right permissions. This is a common post-cleanup headache.

## Understanding the Problem

The OpenTelemetry Operator has used finalizers on OpenTelemetryCollector resources to perform cleanup before deletion. When you delete a namespace, Kubernetes tries to delete all resources in it, including OTel custom resources. The finalizer tells Kubernetes to wait for the Operator to finish cleanup.

In current OpenTelemetry Operator releases, namespaced collector finalizer behavior has been tightened so the Operator only adds the collector finalizer when the required cluster-level RBAC is available, and it also handles legacy finalizers more gracefully. Older or upgraded clusters can still have OpenTelemetryCollector resources carrying the legacy finalizer.

If the Operator cannot complete cleanup (usually due to missing RBAC permissions), the resource stays in a "deleting" state with the finalizer, and the namespace cannot be deleted.

```bash
# Check why the namespace is stuck

kubectl get namespace my-namespace -o yaml

# Look for:
# status:
#   conditions:
#   - message: 'Some content in the namespace still exists...'
#     type: NamespaceContentRemaining

# Find what resources are stuck
kubectl api-resources --verbs=list --namespaced -o name | \
  xargs -n 1 kubectl get --show-kind --ignore-not-found -n my-namespace
```

## Diagnosing the Stuck Resources

```bash
# Check for OpenTelemetryCollector resources with finalizers
kubectl get opentelemetrycollectors -n my-namespace -o yaml | grep -A3 "finalizers"

# Example output:
# metadata:
#   finalizers:
#   - opentelemetrycollector.opentelemetry.io/finalizer
#   deletionTimestamp: "2026-02-06T10:30:00Z"  # Deletion pending but stuck

# Check other OTel custom resources if they exist in the namespace
kubectl get instrumentations -n my-namespace -o yaml | grep -A3 "finalizers"

# Check the Operator logs for RBAC errors
kubectl logs -n opentelemetry-operator-system \
  deployment/opentelemetry-operator-controller-manager | grep -i "forbidden\|rbac\|finaliz"
```

## Fix 1: Grant the Operator Missing RBAC Permissions

The Operator needs permissions to clean up resources it created. If it deployed Collectors, it needs access to Deployments, Services, ServiceAccounts, etc.:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: opentelemetry-operator-manager-role
rules:
  # Existing rules plus:
  - apiGroups: [""]
    resources: ["services", "serviceaccounts", "configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["apps"]
    resources: ["deployments", "daemonsets", "statefulsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["opentelemetry.io"]
    resources: ["opentelemetrycollectors", "instrumentations", "opampbridges"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["opentelemetry.io"]
    resources: ["opentelemetrycollectors/finalizers"]
    verbs: ["get", "update", "patch"]
```

After updating RBAC, the Operator should be able to complete the finalizer and the namespace deletion will proceed.

## Fix 2: Manually Remove the Finalizer

If you just need the namespace deleted and do not care about clean finalizer execution:

```bash
# Remove the finalizer from the stuck OpenTelemetryCollector resource
kubectl patch opentelemetrycollector my-collector -n my-namespace \
  --type=json -p='[{"op": "remove", "path": "/metadata/finalizers"}]'

# Remove finalizers from Instrumentation resources if they have unrelated or custom finalizers
kubectl patch instrumentation my-instrumentation -n my-namespace \
  --type=json -p='[{"op": "remove", "path": "/metadata/finalizers"}]'
```

If the resource has already been marked for deletion and kubectl patch does not work, use the API directly:

```bash
# Get the resource and remove finalizers via the API
kubectl get opentelemetrycollector my-collector -n my-namespace -o json | \
  jq '.metadata.finalizers = []' | \
  kubectl replace --raw "/apis/opentelemetry.io/v1beta1/namespaces/my-namespace/opentelemetrycollectors/my-collector" -f -
```

## Fix 3: Force Delete the Namespace

As a last resort, you can force-delete the namespace by removing its finalizer:

```bash
# Get the namespace spec
kubectl get namespace my-namespace -o json > ns.json

# Edit ns.json: remove the "kubernetes" finalizer from spec.finalizers
# Then apply it:
kubectl replace --raw "/api/v1/namespaces/my-namespace/finalize" -f ns.json
```

A scripted version:

```bash
kubectl get namespace my-namespace -o json | \
  jq '.spec.finalizers = []' | \
  kubectl replace --raw "/api/v1/namespaces/my-namespace/finalize" -f -
```

Warning: Force-deleting a namespace can leave orphaned resources in the cluster. Only do this if you have verified that no important resources are stuck.

## Preventing This in the Future

### Delete OTel Resources Before the Namespace

Before deleting a namespace, explicitly delete OTel custom resources first:

```bash
# Delete all OTel resources in the namespace
kubectl delete opentelemetrycollectors --all -n my-namespace
kubectl delete instrumentations --all -n my-namespace

# Wait for them to be fully removed
kubectl wait --for=delete opentelemetrycollector --all -n my-namespace --timeout=60s

# Now delete the namespace
kubectl delete namespace my-namespace
```

### Ensure RBAC Is Cluster-Wide

The Operator's ClusterRoleBinding should not be scoped to specific namespaces:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: opentelemetry-operator-manager-rolebinding
subjects:
  - kind: ServiceAccount
    name: opentelemetry-operator-controller-manager
    namespace: opentelemetry-operator-system
roleRef:
  kind: ClusterRole
  name: opentelemetry-operator-manager-role
  apiGroup: rbac.authorization.k8s.io
```

### Add a Pre-Delete Hook in Helm

If using Helm to manage namespaces, run the hook with a ServiceAccount that can delete these custom resources:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: cleanup-otel-resources
  annotations:
    "helm.sh/hook": pre-delete
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  template:
    spec:
      serviceAccountName: cleanup-otel-resources
      containers:
        - name: cleanup
          image: bitnami/kubectl:latest
          env:
            - name: NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
          command:
            - sh
            - -c
            - |
              kubectl delete opentelemetrycollectors --all -n ${NAMESPACE}
              kubectl delete instrumentations --all -n ${NAMESPACE}
              sleep 10  # Give the Operator time to process finalizers
      restartPolicy: OnFailure
```

Stuck namespaces from finalizers are a known pain point in Kubernetes. The best prevention is proper RBAC for the Operator and explicit cleanup of custom resources before namespace deletion.
