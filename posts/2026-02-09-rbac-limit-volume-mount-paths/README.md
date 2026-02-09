# How to Implement RBAC Policies That Limit Volume Mount Paths and Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security, Volumes, Storage

Description: Learn how to implement RBAC policies combined with admission controls to restrict volume mount paths and types, preventing users from mounting sensitive host paths or unauthorized storage.

---

Volume mounts determine what data containers can access. Unrestricted volume mounting creates serious security risks. A container that mounts the host root filesystem can read any file on the node, including secrets, SSH keys, and kubeconfig files. A container that mounts Docker socket can create privileged containers and escape to the host. Controlling volume types and paths is essential for cluster security.

RBAC alone cannot restrict specific volume paths or types within pod specifications. RBAC controls whether a user can create pods, but not what goes inside those pods. To restrict volume configurations, you need to combine RBAC with admission controllers like Pod Security Admission, OPA Gatekeeper, or custom admission webhooks.

## Understanding Volume Security Risks

Common dangerous volume configurations include:

**hostPath Volumes**: Mount paths from the host filesystem into containers. Mounting sensitive paths like `/`, `/etc`, `/var/run/docker.sock`, or `/var/lib/kubelet` allows container escape and cluster compromise.

**Unrestricted PersistentVolumeClaims**: If users can create PVCs without restrictions, they might claim volumes containing sensitive data from other teams.

**ConfigMap and Secret Mounts**: While generally safe, users should only mount ConfigMaps and Secrets they have permission to read.

**EmptyDir with Host Memory**: EmptyDir volumes with medium `Memory` consume node RAM and can cause node instability if oversized.

## Controlling Who Can Create Pods with Volumes

Start with RBAC to control which users can create pods at all:

```yaml
# pod-creator-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pod-creator
rules:
# Basic pod creation
- apiGroups: [""]
  resources:
    - pods
  verbs: ["create", "get", "list", "watch"]

# Need to read ConfigMaps and Secrets to reference them
- apiGroups: [""]
  resources:
    - configmaps
    - secrets
  verbs: ["get", "list"]

# Need to create PVCs
- apiGroups: [""]
  resources:
    - persistentvolumeclaims
  verbs: ["create", "get", "list", "watch"]
```

This role allows creating pods with volumes, but does not restrict which volume types. Add admission controls to enforce restrictions.

## Using Pod Security Admission to Restrict Volume Types

Pod Security Admission (PSA) is the Kubernetes-native way to restrict pod configurations. Apply the restricted standard to namespaces:

```yaml
# restricted-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: applications
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

Apply the namespace:

```bash
kubectl apply -f restricted-namespace.yaml
```

The restricted profile blocks:

- hostPath volumes
- hostPort
- Privileged containers
- Host namespaces (IPC, Network, PID)
- Dangerous capabilities

Allowed volume types in restricted profile:

- configMap
- downwardAPI
- emptyDir
- persistentVolumeClaim
- projected
- secret

Test that hostPath is blocked:

```yaml
# dangerous-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: hostpath-test
  namespace: applications
spec:
  containers:
  - name: nginx
    image: nginx
    volumeMounts:
    - name: host-root
      mountPath: /host
  volumes:
  - name: host-root
    hostPath:
      path: /  # Mounting host root
```

Try to create it:

```bash
kubectl apply -f dangerous-pod.yaml
# Error: pods "hostpath-test" is forbidden: violates PodSecurity "restricted:latest"
```

## Implementing OPA Gatekeeper for Fine-Grained Control

For more granular control beyond PSA, use OPA Gatekeeper. Install Gatekeeper:

```bash
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml
```

Create a constraint template that restricts volume paths:

```yaml
# restrict-volume-paths-template.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srestrictvolumepaths
spec:
  crd:
    spec:
      names:
        kind: K8sRestrictVolumePaths
      validation:
        openAPIV3Schema:
          type: object
          properties:
            allowedPaths:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srestrictvolumepaths

        violation[{"msg": msg}] {
          volume := input.review.object.spec.volumes[_]
          volume.hostPath
          path := volume.hostPath.path
          not path_allowed(path)
          msg := sprintf("hostPath volume with path %v is not allowed", [path])
        }

        path_allowed(path) {
          allowed := input.parameters.allowedPaths[_]
          startswith(path, allowed)
        }
```

Apply the template:

```bash
kubectl apply -f restrict-volume-paths-template.yaml
```

Create a constraint that blocks dangerous paths:

```yaml
# block-dangerous-paths-constraint.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRestrictVolumePaths
metadata:
  name: block-dangerous-hostpaths
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces:
      - applications
  parameters:
    allowedPaths:
      - /tmp  # Only allow /tmp hostPath mounts
      - /var/log/pods  # Allow pod log directory for debugging
```

Apply the constraint:

```bash
kubectl apply -f block-dangerous-paths-constraint.yaml
```

Now pods with dangerous hostPath mounts are rejected:

```bash
# Try to mount /etc
kubectl run test --image=nginx \
  --overrides='{"spec":{"volumes":[{"name":"host-etc","hostPath":{"path":"/etc"}}],"containers":[{"name":"nginx","image":"nginx","volumeMounts":[{"name":"host-etc","mountPath":"/host-etc"}]}]}}' \
  -n applications

# Error: admission webhook denied the request: hostPath volume with path /etc is not allowed
```

## Restricting PersistentVolumeClaim Usage

Control which StorageClasses users can reference in PVCs:

```yaml
# restrict-storage-class-template.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srestrictstorageclass
spec:
  crd:
    spec:
      names:
        kind: K8sRestrictStorageClass
      validation:
        openAPIV3Schema:
          type: object
          properties:
            allowedStorageClasses:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srestrictstorageclass

        violation[{"msg": msg}] {
          input.review.object.kind == "PersistentVolumeClaim"
          storage_class := input.review.object.spec.storageClassName
          not storage_class_allowed(storage_class)
          msg := sprintf("StorageClass %v is not allowed", [storage_class])
        }

        storage_class_allowed(sc) {
          allowed := input.parameters.allowedStorageClasses[_]
          sc == allowed
        }
```

Create a constraint:

```yaml
# allow-standard-storage-constraint.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRestrictStorageClass
metadata:
  name: allow-standard-storage
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["PersistentVolumeClaim"]
    namespaces:
      - applications
  parameters:
    allowedStorageClasses:
      - standard
      - fast-ssd
```

Users can only create PVCs with approved StorageClasses:

```yaml
# allowed-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: applications
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard  # Allowed
  resources:
    requests:
      storage: 10Gi
```

```yaml
# blocked-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: premium-data
  namespace: applications
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: premium-nvme  # Not in allowed list
  resources:
    requests:
      storage: 10Gi
```

The first PVC succeeds, the second is rejected.

## Controlling ConfigMap and Secret Mounts

RBAC controls who can read ConfigMaps and Secrets. A user who cannot `get` a Secret cannot mount it:

```yaml
# app-developer-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-developer
  namespace: applications
rules:
# Can create pods
- apiGroups: [""]
  resources:
    - pods
  verbs: ["create", "get", "list", "watch", "delete"]

# Can read specific ConfigMaps
- apiGroups: [""]
  resources:
    - configmaps
  verbs: ["get", "list"]
  resourceNames:
    - app-config  # Only this ConfigMap

# Can read specific Secrets
- apiGroups: [""]
  resources:
    - secrets
  verbs: ["get"]
  resourceNames:
    - app-secrets  # Only this Secret
```

When a developer tries to create a pod that mounts a Secret they cannot read:

```yaml
# unauthorized-mount.yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
  namespace: applications
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: database-creds
      mountPath: /etc/secrets
  volumes:
  - name: database-creds
    secret:
      secretName: database-admin-password  # User does not have access
```

The pod is rejected:

```bash
kubectl apply -f unauthorized-mount.yaml
# Error: cannot get secret "database-admin-password"
```

## Restricting EmptyDir Size and Medium

Use Gatekeeper to limit EmptyDir volume sizes:

```yaml
# restrict-emptydir-template.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srestrictemptydir
spec:
  crd:
    spec:
      names:
        kind: K8sRestrictEmptyDir
      validation:
        openAPIV3Schema:
          type: object
          properties:
            maxSizeLimit:
              type: string
            allowMemoryMedium:
              type: boolean
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srestrictemptydir

        violation[{"msg": msg}] {
          volume := input.review.object.spec.volumes[_]
          volume.emptyDir
          volume.emptyDir.medium == "Memory"
          not input.parameters.allowMemoryMedium
          msg := "emptyDir with Memory medium is not allowed"
        }
```

Create a constraint:

```yaml
# block-memory-emptydir-constraint.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRestrictEmptyDir
metadata:
  name: block-memory-emptydir
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces:
      - applications
  parameters:
    allowMemoryMedium: false
```

## Implementing Custom Admission Webhook

For complex logic, create a custom admission webhook. Here is a simple example that validates volume mounts:

```python
# volume-validator-webhook.py
from flask import Flask, request, jsonify

app = Flask(__name__)

DANGEROUS_PATHS = [
    "/", "/etc", "/root", "/var/run/docker.sock",
    "/var/lib/kubelet", "/proc", "/sys"
]

@app.route('/validate', methods=['POST'])
def validate():
    admission_review = request.json
    pod_spec = admission_review['request']['object']['spec']

    # Check for dangerous hostPath volumes
    for volume in pod_spec.get('volumes', []):
        if 'hostPath' in volume:
            path = volume['hostPath']['path']
            for dangerous in DANGEROUS_PATHS:
                if path == dangerous or path.startswith(dangerous + '/'):
                    return jsonify({
                        "apiVersion": "admission.k8s.io/v1",
                        "kind": "AdmissionReview",
                        "response": {
                            "uid": admission_review['request']['uid'],
                            "allowed": False,
                            "status": {
                                "message": f"hostPath volume mounting {path} is not allowed"
                            }
                        }
                    })

    # Allow the pod
    return jsonify({
        "apiVersion": "admission.k8s.io/v1",
        "kind": "AdmissionReview",
        "response": {
            "uid": admission_review['request']['uid'],
            "allowed": True
        }
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8443, ssl_context='adhoc')
```

Deploy the webhook and register it with Kubernetes using ValidatingWebhookConfiguration.

## Auditing Volume Mount Violations

Track attempted violations in audit logs:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log rejected pod creations (likely volume violations)
- level: Metadata
  resources:
  - group: ""
    resources: ["pods"]
  verbs: ["create"]
  omitStages:
    - RequestReceived
```

Query for violations:

```bash
# Find rejected pod creations
jq 'select(.objectRef.resource=="pods" and
           .verb=="create" and
           .responseStatus.code==403)' \
  /var/log/kubernetes/audit.log

# Extract violation details
jq 'select(.objectRef.resource=="pods" and .responseStatus.code==403) |
    {user: .user.username, namespace: .objectRef.namespace, reason: .responseStatus.message}' \
  /var/log/kubernetes/audit.log
```

Restricting volume mount paths and types requires layering multiple security controls. RBAC controls who can create pods and access secrets. Pod Security Admission or Gatekeeper enforces what volume types are allowed. Admission webhooks provide custom validation logic. Together, these controls prevent users from mounting sensitive host paths or accessing unauthorized storage, maintaining strong security boundaries in multi-tenant clusters.
