# How to Configure Security Context for Flux Controllers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Security Context, Container Security, Pod Hardening, RBAC

Description: Learn how to configure security contexts for Flux controllers to enforce least-privilege principles and harden your GitOps infrastructure.

---

Security contexts in Kubernetes define privilege and access control settings for pods and containers. Properly configuring security contexts for Flux controllers is essential to minimize the attack surface of your GitOps infrastructure. This guide covers how to configure both pod-level and container-level security contexts for all Flux controllers.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster (v1.25 or later)
- Flux CLI (v2.0 or later) installed and bootstrapped
- kubectl configured to access your cluster
- A Git repository connected to Flux
- Basic understanding of Kubernetes security contexts

## Step 1: Review Default Flux Controller Security Contexts

Examine the current security context settings of your Flux controllers:

```bash
# Check all Flux controller security contexts
for deploy in source-controller kustomize-controller helm-controller notification-controller; do
  echo "=== $deploy ==="
  kubectl get deployment "$deploy" -n flux-system -o json | \
    jq '{
      podSecurityContext: .spec.template.spec.securityContext,
      containerSecurityContext: .spec.template.spec.containers[0].securityContext
    }'
  echo ""
done
```

## Step 2: Define Pod-Level Security Context

The pod-level security context applies to all containers within the pod. Create patches to configure it:

```yaml
# clusters/my-cluster/flux-system/patches/pod-security-context.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 65534
        runAsGroup: 65534
        fsGroup: 65534
        seccompProfile:
          type: RuntimeDefault
```

Key pod-level security context fields:

- `runAsNonRoot`: Ensures the container does not run as the root user
- `runAsUser`/`runAsGroup`: Specifies the numeric UID/GID for the process
- `fsGroup`: Sets the group ownership of mounted volumes
- `seccompProfile`: Restricts system calls the container can make

## Step 3: Define Container-Level Security Context

Configure the container-level security context for each Flux controller:

```yaml
# clusters/my-cluster/flux-system/patches/container-security-context.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            runAsUser: 65534
            capabilities:
              drop:
                - ALL
            seccompProfile:
              type: RuntimeDefault
```

## Step 4: Apply Security Context Patches via Kustomize

Configure the Flux system kustomization to apply security patches to all controllers:

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Source Controller
  - target:
      kind: Deployment
      name: source-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: source-controller
      spec:
        template:
          spec:
            securityContext:
              runAsNonRoot: true
              runAsUser: 65534
              fsGroup: 65534
              seccompProfile:
                type: RuntimeDefault
            containers:
              - name: manager
                securityContext:
                  allowPrivilegeEscalation: false
                  readOnlyRootFilesystem: true
                  runAsNonRoot: true
                  capabilities:
                    drop: ["ALL"]
                  seccompProfile:
                    type: RuntimeDefault
                volumeMounts:
                  - name: tmp
                    mountPath: /tmp
                  - name: data
                    mountPath: /data
            volumes:
              - name: tmp
                emptyDir: {}
              - name: data
                emptyDir: {}
  # Kustomize Controller
  - target:
      kind: Deployment
      name: kustomize-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: kustomize-controller
      spec:
        template:
          spec:
            securityContext:
              runAsNonRoot: true
              runAsUser: 65534
              fsGroup: 65534
              seccompProfile:
                type: RuntimeDefault
            containers:
              - name: manager
                securityContext:
                  allowPrivilegeEscalation: false
                  readOnlyRootFilesystem: true
                  runAsNonRoot: true
                  capabilities:
                    drop: ["ALL"]
                  seccompProfile:
                    type: RuntimeDefault
                volumeMounts:
                  - name: tmp
                    mountPath: /tmp
            volumes:
              - name: tmp
                emptyDir: {}
  # Helm Controller
  - target:
      kind: Deployment
      name: helm-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: helm-controller
      spec:
        template:
          spec:
            securityContext:
              runAsNonRoot: true
              runAsUser: 65534
              fsGroup: 65534
              seccompProfile:
                type: RuntimeDefault
            containers:
              - name: manager
                securityContext:
                  allowPrivilegeEscalation: false
                  readOnlyRootFilesystem: true
                  runAsNonRoot: true
                  capabilities:
                    drop: ["ALL"]
                  seccompProfile:
                    type: RuntimeDefault
                volumeMounts:
                  - name: tmp
                    mountPath: /tmp
                  - name: helm-cache
                    mountPath: /home/nonroot/.cache
                  - name: helm-config
                    mountPath: /home/nonroot/.config
            volumes:
              - name: tmp
                emptyDir: {}
              - name: helm-cache
                emptyDir: {}
              - name: helm-config
                emptyDir: {}
  # Notification Controller
  - target:
      kind: Deployment
      name: notification-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: notification-controller
      spec:
        template:
          spec:
            securityContext:
              runAsNonRoot: true
              runAsUser: 65534
              fsGroup: 65534
              seccompProfile:
                type: RuntimeDefault
            containers:
              - name: manager
                securityContext:
                  allowPrivilegeEscalation: false
                  readOnlyRootFilesystem: true
                  runAsNonRoot: true
                  capabilities:
                    drop: ["ALL"]
                  seccompProfile:
                    type: RuntimeDefault
                volumeMounts:
                  - name: tmp
                    mountPath: /tmp
            volumes:
              - name: tmp
                emptyDir: {}
```

## Step 5: Configure Resource Limits

Add resource limits alongside security contexts to prevent resource exhaustion:

```yaml
# Additional patch for resource limits
- target:
    kind: Deployment
    name: source-controller
    namespace: flux-system
  patch: |
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: source-controller
    spec:
      template:
        spec:
          containers:
            - name: manager
              resources:
                limits:
                  cpu: 1000m
                  memory: 1Gi
                requests:
                  cpu: 100m
                  memory: 64Mi
```

## Step 6: Configure Service Account Settings

Disable automatic service account token mounting where possible and use dedicated service accounts:

```yaml
# Patch to configure service account settings
- target:
    kind: Deployment
    name: source-controller
    namespace: flux-system
  patch: |
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: source-controller
    spec:
      template:
        spec:
          serviceAccountName: source-controller
          automountServiceAccountToken: true  # Required for Flux controllers
```

For non-Flux workloads managed by Flux, disable auto-mounting:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
```

## Step 7: Audit Security Contexts Across the Cluster

Create a script to audit security context configurations:

```bash
#!/bin/bash
set -euo pipefail

echo "Security Context Audit Report"
echo "=============================="
echo ""

NAMESPACES="${1:-flux-system}"

for ns in $NAMESPACES; do
  echo "Namespace: $ns"
  echo "---"

  kubectl get pods -n "$ns" -o json | jq -r '
    .items[] | {
      pod: .metadata.name,
      podRunAsNonRoot: .spec.securityContext.runAsNonRoot,
      podSeccomp: .spec.securityContext.seccompProfile.type,
      containers: [.spec.containers[] | {
        name: .name,
        runAsNonRoot: .securityContext.runAsNonRoot,
        readOnlyRootFilesystem: .securityContext.readOnlyRootFilesystem,
        allowPrivilegeEscalation: .securityContext.allowPrivilegeEscalation,
        capabilities: .securityContext.capabilities,
        seccomp: .securityContext.seccompProfile.type
      }]
    }
  '
  echo ""
done
```

Save and run it:

```bash
chmod +x audit-security-contexts.sh
./audit-security-contexts.sh flux-system
```

## Verification

After applying the security context configurations, verify the following:

1. All Flux controllers are running successfully:

```bash
flux check
kubectl get pods -n flux-system
```

2. Security contexts are applied correctly:

```bash
kubectl get pods -n flux-system -o json | jq '.items[] | {
  name: .metadata.name,
  runAsNonRoot: .spec.securityContext.runAsNonRoot,
  containerSecurity: [.spec.containers[].securityContext]
}'
```

3. Controllers can still perform their functions:

```bash
flux reconcile kustomization flux-system --with-source
flux get all -A
```

4. No privilege escalation is possible:

```bash
kubectl auth can-i --as=system:serviceaccount:flux-system:source-controller \
  create pods -n flux-system
```

5. Verify the processes are running as the expected user:

```bash
kubectl exec -n flux-system deploy/source-controller -- id
# Expected: uid=65534(nobody) gid=65534(nobody)
```

## Troubleshooting

### Controller pod fails to start with CrashLoopBackOff

Check the pod logs for permission errors:

```bash
kubectl logs -n flux-system deploy/source-controller --previous
```

Common issues include:
- Missing writable volume mounts for temporary files
- Incorrect UID/GID that does not match the container's user

### Read-only filesystem errors

If a controller needs to write files, add emptyDir volume mounts:

```bash
# Check which paths need write access
kubectl logs -n flux-system deploy/helm-controller | grep -i "read-only"
```

### seccomp profile errors on older clusters

If the RuntimeDefault seccomp profile is not available:

```bash
# Check if seccomp is supported
kubectl get node -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].message}'
```

Remove the seccomp profile setting if not supported by your cluster.

### Capability-related failures

If dropping all capabilities causes issues, identify the required capability:

```bash
kubectl logs -n flux-system deploy/source-controller | grep -i "operation not permitted"
```

Add only the specific required capability:

```yaml
capabilities:
  drop: ["ALL"]
  add: ["NET_BIND_SERVICE"]  # Only if needed
```

### Volume permission denied with fsGroup

If mounted volumes have incorrect permissions, verify the fsGroup matches the runAsUser:

```yaml
securityContext:
  runAsUser: 65534
  fsGroup: 65534  # Must match or volumes will be inaccessible
```

## Summary

Configuring security contexts for Flux controllers is a foundational step in hardening your GitOps infrastructure. By enforcing non-root execution, dropping all unnecessary capabilities, enabling read-only root filesystems, and applying seccomp profiles, you significantly reduce the attack surface of the controllers that manage your Kubernetes cluster. These configurations work together with Pod Security Admission and RBAC to create a defense-in-depth security posture for your Flux deployment.
