# How to Configure RBAC to Restrict Pod Deletion While Allowing Deployment Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Pods, Deployments, Operations

Description: Learn how to implement RBAC policies that prevent direct pod deletion while allowing deployment updates, protecting workloads from accidental disruption.

---

Deleting pods directly causes immediate disruption. While Kubernetes recreates pods automatically if managed by a Deployment, direct pod deletion bypasses rolling update strategies and can cause brief outages. Developers should manage workloads through Deployments, not by directly manipulating pods.

RBAC can prevent pod deletion while allowing deployment updates. Users can change container images, update environment variables, and scale replicas through the Deployment controller, which handles updates gracefully with rolling updates and readiness checks. This separation protects production workloads from accidental `kubectl delete pod` commands.

## Understanding Pod vs Deployment Management

Pods and Deployments are separate API resources with different RBAC rules:

**Pods**: Direct container runtime instances. Deleting a pod removes it immediately.

**Deployments**: Higher-level controllers that manage ReplicaSets and Pods. Updating a deployment triggers a controlled rollout.

A user can have permission to update deployments without permission to delete individual pods. This creates a safe workflow where all changes flow through the deployment controller.

## Creating a Deployment Manager Role

Build a role that allows managing deployments but not deleting pods:

```yaml
# deployment-manager-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: deployment-manager
rules:
# Full control over deployments
- apiGroups: ["apps"]
  resources:
    - deployments
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Read-only access to ReplicaSets (to see deployment status)
- apiGroups: ["apps"]
  resources:
    - replicasets
  verbs: ["get", "list", "watch"]

# Read-only access to pods (to see running state)
- apiGroups: [""]
  resources:
    - pods
  verbs: ["get", "list", "watch"]
# Notice: No delete verb on pods

# Pod logs for debugging
- apiGroups: [""]
  resources:
    - pods/log
  verbs: ["get", "list"]

# Services
- apiGroups: [""]
  resources:
    - services
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# ConfigMaps and Secrets (read-only)
- apiGroups: [""]
  resources:
    - configmaps
    - secrets
  verbs: ["get", "list", "watch"]
```

Apply the role:

```bash
kubectl apply -f deployment-manager-role.yaml
```

Bind to developers:

```bash
kubectl create rolebinding dev-deployment-manager \
  --clusterrole=deployment-manager \
  --group=developers \
  --namespace=production
```

Developers can update deployments but cannot delete pods directly.

## Testing Deployment Update Permissions

Verify users can update deployments:

```bash
# Update deployment image
kubectl set image deployment/my-app \
  app=my-app:v2.0 \
  -n production \
  --as=developer@company.com
# Should succeed

# Scale deployment
kubectl scale deployment my-app --replicas=5 \
  -n production \
  --as=developer@company.com
# Should succeed

# Update deployment spec
kubectl patch deployment my-app -n production \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","env":[{"name":"LOG_LEVEL","value":"debug"}]}]}}}}' \
  --as=developer@company.com
# Should succeed
```

These updates trigger controlled rollouts with rolling update strategy.

## Testing Pod Deletion Restrictions

Verify users cannot delete pods:

```bash
# Try to delete a pod
kubectl delete pod my-app-abc123 -n production --as=developer@company.com
# Error: User cannot delete resource "pods"

# Try to delete all pods
kubectl delete pods --all -n production --as=developer@company.com
# Error: User cannot delete resource "pods"
```

If users need to restart a pod, they must do it through the deployment:

```bash
# Restart deployment (recreates all pods with rolling update)
kubectl rollout restart deployment my-app -n production --as=developer@company.com
# Should succeed
```

## Allowing Pod Eviction for Maintenance

Node maintenance requires evicting pods. Create a separate role for operations team:

```yaml
# pod-evictor-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pod-evictor
rules:
# Pod eviction API
- apiGroups: ["policy"]
  resources:
    - poddisruptionbudgets
  verbs: ["get", "list"]

- apiGroups: [""]
  resources:
    - pods/eviction
  verbs: ["create"]

# Read pods to identify eviction targets
- apiGroups: [""]
  resources:
    - pods
  verbs: ["get", "list"]

# Read nodes for drain operations
- apiGroups: [""]
  resources:
    - nodes
  verbs: ["get", "list", "patch"]  # patch for cordoning
```

Bind to SRE team:

```bash
kubectl apply -f pod-evictor-role.yaml

kubectl create clusterrolebinding sre-pod-eviction \
  --clusterrole=pod-evictor \
  --group=sre-team
```

SRE team can drain nodes safely:

```bash
# Cordon and drain node
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data
# Uses eviction API which respects PodDisruptionBudgets
```

## Implementing Debug Role with Temporary Pod Deletion

For debugging, create a role that allows pod deletion in non-production:

```yaml
# debug-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: debug-role
rules:
# Full pod access in development
- apiGroups: [""]
  resources:
    - pods
    - pods/log
    - pods/exec
  verbs: ["*"]

# Deployment management
- apiGroups: ["apps"]
  resources:
    - deployments
    - replicasets
  verbs: ["*"]
```

Bind only to development namespace:

```bash
kubectl apply -f debug-role.yaml

kubectl create rolebinding dev-debug \
  --clusterrole=debug-role \
  --group=developers \
  --namespace=development
# Not bound to production
```

Developers can delete pods freely in development but not production.

## Handling StatefulSets and DaemonSets

StatefulSets require careful handling as pod deletion can affect data:

```yaml
# statefulset-manager-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: statefulset-manager
rules:
# Manage StatefulSets
- apiGroups: ["apps"]
  resources:
    - statefulsets
  verbs: ["get", "list", "watch", "update", "patch"]
# No delete on StatefulSets - requires admin approval

# Read pods
- apiGroups: [""]
  resources:
    - pods
  verbs: ["get", "list", "watch"]
# No delete on pods

# Manage PVCs (StatefulSet volumes)
- apiGroups: [""]
  resources:
    - persistentvolumeclaims
  verbs: ["get", "list", "watch"]
# Read-only to prevent data loss
```

StatefulSet updates require manual approval for pod deletion in many organizations due to data persistence concerns.

## Creating Emergency Pod Deletion Access

For emergencies, implement break-glass pod deletion:

```bash
#!/bin/bash
# emergency-pod-delete.sh

INCIDENT_ID=$1
USER=$2
NAMESPACE=$3

if [ -z "$INCIDENT_ID" ] || [ -z "$USER" ] || [ -z "$NAMESPACE" ]; then
  echo "Usage: $0 <incident-id> <user> <namespace>"
  exit 1
fi

echo "Creating emergency pod deletion access for incident $INCIDENT_ID"

kubectl create rolebinding "emergency-pod-delete-${INCIDENT_ID}" \
  --clusterrole=cluster-admin \
  --user="$USER" \
  --namespace="$NAMESPACE"

echo "Access granted. Remember to revoke after incident resolution:"
echo "kubectl delete rolebinding emergency-pod-delete-${INCIDENT_ID} -n ${NAMESPACE}"

# Auto-revoke after 1 hour
sleep 3600 && \
  kubectl delete rolebinding "emergency-pod-delete-${INCIDENT_ID}" -n "$NAMESPACE" && \
  echo "Emergency access for incident $INCIDENT_ID automatically revoked" &
```

Use during critical incidents:

```bash
./emergency-pod-delete.sh INC-12345 oncall@company.com production
```

Log all emergency access grants for audit.

## Monitoring Pod Deletion Attempts

Track unauthorized pod deletion attempts:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log pod deletion attempts
- level: Metadata
  resources:
  - group: ""
    resources: ["pods"]
  verbs: ["delete"]

# Log failed deletion attempts specifically
- level: Metadata
  resources:
  - group: ""
    resources: ["pods"]
  verbs: ["delete"]
  omitStages:
  - RequestReceived
  responseStatus:
    code: 403
```

Query for unauthorized attempts:

```bash
# Find failed pod deletions
jq 'select(.objectRef.resource=="pods" and
           .verb=="delete" and
           .responseStatus.code==403)' \
  /var/log/kubernetes/audit.log

# Group by user
jq 'select(.objectRef.resource=="pods" and
           .verb=="delete" and
           .responseStatus.code==403) |
    .user.username' \
  /var/log/kubernetes/audit.log | sort | uniq -c | sort -rn
```

Alert on repeated attempts:

```yaml
# Prometheus alert
- alert: RepeatedPodDeletionAttempts
  expr: |
    sum(rate(apiserver_audit_event_total{
      resource="pods",
      verb="delete",
      responseStatus_code="403"
    }[5m])) by (user) > 5
  annotations:
    summary: "User {{ $labels.user }} attempting pod deletions repeatedly"
```

## Educating Users on Proper Workflows

Document the approved workflow:

```markdown
# Pod Management Guidelines

## ❌ Do NOT Delete Pods Directly
```bash
kubectl delete pod my-app-abc123  # Causes immediate disruption
```

## ✅ Use Deployment Operations Instead

### Restart All Pods
```bash
kubectl rollout restart deployment my-app
```

### Update Container Image
```bash
kubectl set image deployment my-app app=my-app:v2.0
```

### Roll Back to Previous Version
```bash
kubectl rollout undo deployment my-app
```

### Force Pod Recreation (if stuck)
```bash
kubectl rollout restart deployment my-app
# Or scale to 0 and back up
kubectl scale deployment my-app --replicas=0
kubectl scale deployment my-app --replicas=3
```
```

Provide training and onboarding materials explaining why direct pod deletion is restricted.

## Exceptions for Debugging

Some scenarios legitimately require pod deletion:

**Stuck Pods**: Pods in CrashLoopBackOff with no deployment to manage them.

**Orphaned Pods**: Pods left behind after deployment deletion.

**Debug Pods**: Temporary pods created for troubleshooting.

Create a separate troubleshooting role for these cases:

```yaml
# troubleshooter-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: troubleshooter
rules:
# Delete pods matching specific patterns
- apiGroups: [""]
  resources:
    - pods
  verbs: ["delete"]
  # Note: Cannot restrict by pod name pattern in RBAC
  # Use admission webhook if needed
```

Bind sparingly to senior engineers only.

Restricting pod deletion while allowing deployment updates creates a safer operational environment. Users manage workloads through proper controllers that handle updates gracefully, while direct pod manipulation requires elevated permissions or emergency access. This pattern prevents accidental disruptions while maintaining flexibility for legitimate operational needs.
