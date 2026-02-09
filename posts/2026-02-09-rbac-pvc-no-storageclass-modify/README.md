# How to Configure RBAC to Allow PersistentVolume Claim Creation Without Storage Class Modification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Storage, PVC, StorageClass

Description: Learn how to configure RBAC policies that allow users to create PersistentVolumeClaims while preventing modification of StorageClasses, maintaining storage infrastructure security.

---

PersistentVolumeClaims let users request storage for their applications. StorageClasses define how that storage is provisioned, including performance characteristics, encryption settings, and backup policies. Users need the ability to create PVCs, but they should not be able to modify StorageClasses that could bypass organizational policies or increase costs.

Separating PVC creation rights from StorageClass management ensures users can request storage while platform teams maintain control over storage infrastructure and policies. This separation is critical in multi-tenant environments where different teams share the same cluster.

## Understanding PVC and StorageClass RBAC

PersistentVolumeClaims and StorageClasses are separate Kubernetes resources with independent RBAC rules:

**PersistentVolumeClaims (PVCs)**: Namespace-scoped resources. Users create PVCs to request storage.

**StorageClasses**: Cluster-scoped resources. Platform administrators create StorageClasses to define available storage tiers.

A user can have permission to create PVCs without any permission to view or modify StorageClasses. The PVC references a StorageClass by name, and Kubernetes provisions storage accordingly.

## Creating a PVC Creator Role

Build a role that allows creating PVCs without StorageClass access:

```yaml
# pvc-creator-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pvc-creator
rules:
# Full control over PVCs
- apiGroups: [""]
  resources:
    - persistentvolumeclaims
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Read PersistentVolumes to see provisioning status
- apiGroups: [""]
  resources:
    - persistentvolumes
  verbs: ["get", "list", "watch"]

# No access to StorageClasses
# This is implicit (not included in rules)
```

Apply the role:

```bash
kubectl apply -f pvc-creator-role.yaml
```

Bind to application teams:

```bash
kubectl create rolebinding app-team-pvc \
  --clusterrole=pvc-creator \
  --group=app-developers \
  --namespace=applications
```

Users can now create PVCs in the applications namespace.

## Testing PVC Creation

Create a PVC as a user with pvc-creator role:

```yaml
# app-data-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: applications
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd  # References existing StorageClass
  resources:
    requests:
      storage: 10Gi
```

Apply as user:

```bash
kubectl apply -f app-data-pvc.yaml --as=developer@company.com
# Should succeed
```

Verify the PVC was created:

```bash
kubectl get pvc app-data -n applications
# NAME       STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
# app-data   Bound    pvc-abc123                                 10Gi       RWO            fast-ssd       10s
```

The user cannot modify StorageClasses:

```bash
kubectl get storageclass fast-ssd --as=developer@company.com
# Error: User cannot get resource "storageclasses"

kubectl patch storageclass fast-ssd \
  --as=developer@company.com \
  -p '{"allowVolumeExpansion": true}'
# Error: User cannot patch resource "storageclasses"
```

## Restricting PVC Size with ResourceQuotas

Prevent users from requesting excessive storage using ResourceQuotas:

```yaml
# storage-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: applications
spec:
  hard:
    requests.storage: 100Gi  # Total storage across all PVCs
    persistentvolumeclaims: "10"  # Maximum number of PVCs
```

Apply as cluster administrator:

```bash
kubectl apply -f storage-quota.yaml
```

Users with pvc-creator role cannot modify this quota:

```bash
kubectl delete resourcequota storage-quota -n applications --as=developer@company.com
# Error: User cannot delete resource "resourcequotas"
```

When users exceed the quota:

```bash
kubectl apply -f large-pvc.yaml --as=developer@company.com
# Error: exceeded quota: storage-quota, requested: requests.storage=200Gi
```

## Limiting StorageClass Selection

Use admission webhooks to restrict which StorageClasses users can reference:

```python
# storageclass-validator.py
from flask import Flask, request, jsonify

app = Flask(__name__)

# Mapping of namespaces to allowed StorageClasses
NAMESPACE_STORAGE_POLICIES = {
    "development": ["standard", "fast-ssd"],
    "production": ["fast-ssd", "premium-nvme"],
    "test": ["standard"],
}

@app.route('/validate-pvc', methods=['POST'])
def validate_pvc():
    admission_review = request.json
    req = admission_review['request']
    pvc = req['object']

    namespace = pvc['metadata']['namespace']
    storage_class = pvc['spec'].get('storageClassName')

    if not storage_class:
        # Allow default StorageClass
        return allow_response(req['uid'])

    allowed_classes = NAMESPACE_STORAGE_POLICIES.get(namespace, [])

    if storage_class not in allowed_classes:
        return deny_response(
            req['uid'],
            f"StorageClass '{storage_class}' is not allowed in namespace '{namespace}'. "
            f"Allowed classes: {', '.join(allowed_classes)}"
        )

    return allow_response(req['uid'])

def allow_response(uid):
    return jsonify({
        "apiVersion": "admission.k8s.io/v1",
        "kind": "AdmissionReview",
        "response": {
            "uid": uid,
            "allowed": True
        }
    })

def deny_response(uid, message):
    return jsonify({
        "apiVersion": "admission.k8s.io/v1",
        "kind": "AdmissionReview",
        "response": {
            "uid": uid,
            "allowed": False,
            "status": {
                "message": message
            }
        }
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8443, ssl_context='adhoc')
```

Deploy the webhook and register it:

```yaml
# pvc-validator-webhook.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: pvc-storageclass-validator
webhooks:
- name: pvc.validator.example.com
  clientConfig:
    service:
      name: pvc-validator
      namespace: kube-system
      path: "/validate-pvc"
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["persistentvolumeclaims"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
```

Now users can only use approved StorageClasses in their namespaces.

## Creating a StorageClass Manager Role

Platform administrators need separate permissions to manage StorageClasses:

```yaml
# storageclass-manager-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: storageclass-manager
rules:
# Full control over StorageClasses
- apiGroups: ["storage.k8s.io"]
  resources:
    - storageclasses
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Manage storage provisioners
- apiGroups: ["storage.k8s.io"]
  resources:
    - csinodes
    - csidrivers
    - csistoragecapacities
  verbs: ["get", "list", "watch"]

# Manage PersistentVolumes
- apiGroups: [""]
  resources:
    - persistentvolumes
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

Bind to storage administrators only:

```bash
kubectl apply -f storageclass-manager-role.yaml

kubectl create clusterrolebinding storage-admins \
  --clusterrole=storageclass-manager \
  --group=storage-admins
```

## Implementing Default StorageClass Policies

Set a default StorageClass so users do not need to specify one:

```yaml
# standard-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iopsPerGB: "10"
  fsType: ext4
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

Apply as storage administrator:

```bash
kubectl apply -f standard-storageclass.yaml
```

Users can create PVCs without specifying storageClassName:

```yaml
# pvc-using-default.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data-default
  namespace: applications
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  # No storageClassName specified, uses default
```

## Auditing PVC and StorageClass Access

Track storage operations in audit logs:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log PVC creation
- level: Metadata
  resources:
  - group: ""
    resources: ["persistentvolumeclaims"]
  verbs: ["create", "delete"]

# Log StorageClass modifications
- level: RequestResponse
  resources:
  - group: "storage.k8s.io"
    resources: ["storageclasses"]
  verbs: ["create", "update", "patch", "delete"]
```

Query for unusual patterns:

```bash
# Find PVCs requesting large storage
jq 'select(.objectRef.resource=="persistentvolumeclaims" and
           .verb=="create") |
    {user: .user.username, namespace: .objectRef.namespace,
     size: .requestObject.spec.resources.requests.storage}' \
  /var/log/kubernetes/audit.log

# Find StorageClass modifications
jq 'select(.objectRef.resource=="storageclasses" and
           .verb in ["create", "update", "patch", "delete"])' \
  /var/log/kubernetes/audit.log
```

Alert on unauthorized StorageClass modifications:

```yaml
- alert: UnauthorizedStorageClassChange
  expr: |
    apiserver_audit_event_total{
      objectRef_resource="storageclasses",
      verb=~"update|patch|delete",
      user_username!~"storage-admin@.*"
    } > 0
  annotations:
    summary: "StorageClass modified by non-admin user"
```

## Monitoring Storage Consumption

Track storage usage per namespace:

```bash
#!/bin/bash
# storage-usage-report.sh

echo "=== Storage Usage Report ==="
echo ""

for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  pvc_count=$(kubectl get pvc -n $ns --no-headers 2>/dev/null | wc -l)
  if [ "$pvc_count" -gt 0 ]; then
    total_storage=$(kubectl get pvc -n $ns -o json 2>/dev/null | \
      jq -r '.items[].status.capacity.storage' | \
      sed 's/Gi//' | \
      awk '{sum+=$1} END {print sum}')

    echo "Namespace: $ns"
    echo "  PVCs: $pvc_count"
    echo "  Total Storage: ${total_storage}Gi"
    echo ""
  fi
done
```

Run periodically to track growth:

```bash
./storage-usage-report.sh > storage-usage-$(date +%Y%m).txt
```

## Implementing Storage Tier Policies

Document storage tier policies for users:

```markdown
# Storage Tier Guidelines

## Available StorageClasses

### `standard` (Default)
- Performance: Standard SSD (100-300 IOPS)
- Use case: Development, testing, non-critical workloads
- Cost: $0.10/GB/month

### `fast-ssd`
- Performance: High IOPS SSD (1000+ IOPS)
- Use case: Production databases, high-traffic applications
- Cost: $0.25/GB/month
- Requires approval for > 50GB

### `premium-nvme`
- Performance: NVMe (10000+ IOPS)
- Use case: Critical databases, high-performance computing
- Cost: $0.50/GB/month
- Requires storage-admin approval

## Request Process

1. Create PVC referencing approved StorageClass
2. For large volumes (>100GB), file storage request ticket
3. Monitor usage via Grafana dashboards
```

Separating PVC creation from StorageClass management gives users self-service storage provisioning while maintaining platform control over storage infrastructure. ResourceQuotas prevent excessive usage, admission webhooks enforce StorageClass policies, and audit logging tracks storage consumption. This approach scales to large multi-tenant environments while keeping storage costs and security under control.
