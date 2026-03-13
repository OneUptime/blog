# How to Build RBAC Roles That Allow Deployment Scaling Without Edit Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Deployments, Scaling, Operations

Description: Learn how to create RBAC roles that allow users to scale deployments up and down without granting full edit permissions that could modify container images or other critical configuration.

---

Scaling deployments is a common operational task. Support teams need to scale applications during traffic spikes. QA teams need to scale down non-critical deployments to save resources. But granting full edit permissions on deployments is risky. Users could modify container images, change environment variables containing secrets, or alter resource limits in ways that destabilize applications.

The challenge is giving users just enough permission to adjust replica counts without allowing them to change any other aspect of the deployment. This requires understanding Kubernetes RBAC's support for specific operations on specific fields within resources.

## Understanding Deployment Update Permissions

The standard `update` verb on deployments allows modifying any field in the deployment spec. This includes replica count, but also container images, command arguments, environment variables, volume mounts, and security contexts. That is too broad for a scaling-only role.

Kubernetes RBAC supports the `patch` verb, which allows partial updates to resources. By combining `patch` permission with a validating webhook or admission controller, you can restrict which fields users can modify. However, there is a simpler approach for scaling specifically.

The Deployment resource has a `/scale` subresource that exposes only the replica count. Granting permission to this subresource allows scaling without access to other deployment fields.

## Creating a Deployment Scaler Role

Build a role that grants access to the scale subresource:

```yaml
# deployment-scaler-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: deployment-scaler
rules:
# Read deployments to see current state
- apiGroups: ["apps"]
  resources:
    - deployments
  verbs: ["get", "list", "watch"]

# Scale deployments
- apiGroups: ["apps"]
  resources:
    - deployments/scale
  verbs: ["get", "update", "patch"]

# Read replica sets to see scaling effects
- apiGroups: ["apps"]
  resources:
    - replicasets
  verbs: ["get", "list", "watch"]

# Read pods to verify scaling
- apiGroups: [""]
  resources:
    - pods
  verbs: ["get", "list", "watch"]
```

Apply the role:

```bash
kubectl apply -f deployment-scaler-role.yaml
```

Bind it to the operations team:

```bash
kubectl create rolebinding ops-scaler \
  --clusterrole=deployment-scaler \
  --group=operations-team \
  --namespace=production
```

Now operations team members can scale deployments but cannot modify other fields.

## Scaling Deployments with Limited Permissions

Users with the deployment-scaler role can scale deployments using kubectl scale:

```bash
# Scale a deployment to 5 replicas
kubectl scale deployment my-app --replicas=5 -n production

# Scale down to 0 (停止应用)
kubectl scale deployment my-app --replicas=0 -n production

# Verify the scaling
kubectl get deployment my-app -n production
```

They can also use kubectl patch with the scale subresource:

```bash
# Scale using patch
kubectl patch deployment my-app -n production \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/replicas", "value": 3}]'
```

However, they cannot modify the deployment directly:

```bash
# This will fail
kubectl patch deployment my-app -n production \
  -p='{"spec":{"template":{"spec":{"containers":[{"name":"my-app","image":"nginx:latest"}]}}}}'

# Error: User cannot update resource "deployments" in API group "apps"
```

The user only has permission for the deployments/scale subresource, not the main deployment resource.

## Scaling StatefulSets and ReplicaSets

The same pattern applies to other workload resources:

```yaml
# workload-scaler-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: workload-scaler
rules:
# Deployments
- apiGroups: ["apps"]
  resources:
    - deployments
    - deployments/scale
  verbs: ["get", "list", "watch", "update", "patch"]

# StatefulSets
- apiGroups: ["apps"]
  resources:
    - statefulsets
    - statefulsets/scale
  verbs: ["get", "list", "watch", "update", "patch"]

# ReplicaSets
- apiGroups: ["apps"]
  resources:
    - replicasets
    - replicasets/scale
  verbs: ["get", "list", "watch", "update", "patch"]

# Read pods
- apiGroups: [""]
  resources:
    - pods
  verbs: ["get", "list", "watch"]
```

Note that we grant `update` and `patch` on the scale subresource, but only `get`, `list`, and `watch` on the main resource.

```bash
kubectl apply -f workload-scaler-role.yaml

# Scale a statefulset
kubectl scale statefulset postgres --replicas=3 -n production

# Scale a replicaset
kubectl scale replicaset my-app-abc123 --replicas=2 -n production
```

## Implementing Autoscaling Permissions

For users who need to configure HorizontalPodAutoscalers (HPAs), create a separate role:

```yaml
# hpa-manager-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: hpa-manager
rules:
# Manage HPAs
- apiGroups: ["autoscaling"]
  resources:
    - horizontalpodautoscalers
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Read deployments to configure HPA targets
- apiGroups: ["apps"]
  resources:
    - deployments
    - deployments/scale
  verbs: ["get", "list", "watch"]

# Read metrics for HPA decisions
- apiGroups: ["metrics.k8s.io"]
  resources:
    - pods
    - nodes
  verbs: ["get", "list"]
```

Users can create and manage HPAs:

```bash
# Create an HPA
kubectl autoscale deployment my-app \
  --min=2 --max=10 --cpu-percent=80 \
  -n production

# Update HPA
kubectl patch hpa my-app -n production \
  -p='{"spec":{"maxReplicas": 15}}'

# View HPA status
kubectl get hpa my-app -n production
```

The HPA controller handles actual scaling based on metrics. Users control the autoscaling configuration without direct scaling permissions.

## Restricting Scale Operations by Size

You might want to prevent users from scaling deployments too large or to zero. This requires a validating webhook or admission controller, as RBAC alone cannot enforce value constraints.

Deploy a simple validating webhook:

```yaml
# scale-validator-webhook.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: scale-validator
webhooks:
- name: scale.validator.example.com
  clientConfig:
    service:
      name: scale-validator
      namespace: kube-system
      path: "/validate-scale"
  rules:
  - operations: ["UPDATE"]
    apiGroups: ["apps"]
    apiVersions: ["v1"]
    resources: ["deployments/scale", "statefulsets/scale"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
```

The webhook service validates scale requests:

```python
# Simple webhook logic
def validate_scale(request):
    new_replicas = request['object']['spec']['replicas']
    deployment_name = request['object']['metadata']['name']

    # Enforce minimum replicas
    if new_replicas < 1:
        return {"allowed": False, "status": {"message": "Cannot scale to 0"}}

    # Enforce maximum replicas
    if new_replicas > 20:
        return {"allowed": False, "status": {"message": "Maximum 20 replicas allowed"}}

    return {"allowed": True}
```

Now users can scale within the approved range, but extreme values are rejected.

## Auditing Scale Operations

Track who is scaling deployments and when:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log scale operations
- level: RequestResponse
  resources:
  - group: "apps"
    resources: ["deployments/scale", "statefulsets/scale"]
  verbs: ["update", "patch"]
```

Query audit logs:

```bash
# Find scale operations
jq 'select(.objectRef.subresource=="scale") |
    {user: .user.username, deployment: .objectRef.name,
     old: .requestObject.spec.replicas, new: .responseObject.spec.replicas}' \
    /var/log/kubernetes/audit.log
```

Create alerts for suspicious scaling patterns:

```yaml
# Prometheus alert
- alert: FrequentScaling
  expr: |
    sum(rate(apiserver_audit_event_total{
      subresource="scale",
      verb=~"update|patch"
    }[5m])) by (user) > 10
  annotations:
    summary: "User {{ $labels.user }} is scaling deployments frequently"
```

## Building a Self-Service Scaling Interface

For non-technical users, build a simple web interface or CLI tool that uses the scaling permissions:

```python
# scale-cli.py
import subprocess
import sys

def scale_deployment(deployment, replicas, namespace):
    """Scale deployment using kubectl with scaler permissions"""
    try:
        result = subprocess.run([
            'kubectl', 'scale', 'deployment', deployment,
            f'--replicas={replicas}',
            f'--namespace={namespace}'
        ], capture_output=True, text=True, check=True)
        print(f"Scaled {deployment} to {replicas} replicas")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error: {e.stderr}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: scale-cli.py <deployment> <replicas> <namespace>")
        sys.exit(1)

    scale_deployment(sys.argv[1], sys.argv[2], sys.argv[3])
```

Users run the tool which uses their scaler permissions:

```bash
python scale-cli.py my-app 5 production
```

## Combining with Cost Controls

Integrate scaling permissions with cost monitoring:

```yaml
# cost-aware-scaler-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cost-aware-scaler
rules:
# Scaling permissions
- apiGroups: ["apps"]
  resources:
    - deployments
    - deployments/scale
  verbs: ["get", "list", "watch", "update", "patch"]

# Read resource quotas to understand limits
- apiGroups: [""]
  resources:
    - resourcequotas
  verbs: ["get", "list", "watch"]

# Read limit ranges
- apiGroups: [""]
  resources:
    - limitranges
  verbs: ["get", "list", "watch"]
```

Users can check quota usage before scaling:

```bash
# Check current resource usage
kubectl describe resourcequota -n production

# Check if scaling is possible
kubectl get deployment my-app -n production -o yaml | grep replicas
kubectl describe deployment my-app -n production | grep Limits
```

Create a pre-scale check script:

```bash
#!/bin/bash
# check-scale-capacity.sh

NAMESPACE=$1
DEPLOYMENT=$2
NEW_REPLICAS=$3

# Get current CPU requests per pod
CPU_PER_POD=$(kubectl get deployment $DEPLOYMENT -n $NAMESPACE -o json | \
  jq -r '.spec.template.spec.containers[0].resources.requests.cpu')

# Calculate total CPU needed
TOTAL_CPU=$(echo "$CPU_PER_POD * $NEW_REPLICAS" | bc)

# Check quota
QUOTA_CPU=$(kubectl get resourcequota -n $NAMESPACE -o json | \
  jq -r '.items[0].spec.hard."requests.cpu"')

if (( $(echo "$TOTAL_CPU > $QUOTA_CPU" | bc -l) )); then
  echo "Error: Scaling to $NEW_REPLICAS would exceed CPU quota"
  exit 1
fi

echo "Scaling is within quota limits"
kubectl scale deployment $DEPLOYMENT --replicas=$NEW_REPLICAS -n $NAMESPACE
```

Scaling-only RBAC roles give operational teams the flexibility to respond to load changes without exposing the risk of modifying application configurations. By using scale subresources and combining them with appropriate guardrails like validating webhooks and cost controls, you create a self-service scaling capability that is both safe and auditable.
