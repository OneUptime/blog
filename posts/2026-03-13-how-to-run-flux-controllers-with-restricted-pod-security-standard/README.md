# How to Run Flux Controllers with Restricted Pod Security Standard

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Pod Security, Restricted PSS, Hardening, Container Security

Description: Learn how to configure Flux controllers to comply with the Kubernetes Restricted Pod Security Standard for maximum workload security.

---

The Restricted Pod Security Standard is the most stringent security profile in Kubernetes, designed to enforce current best practices for pod hardening. Running Flux controllers under this standard ensures that your GitOps infrastructure operates with the minimum required privileges. This guide shows you how to configure Flux controllers to comply with the Restricted Pod Security Standard.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster (v1.25 or later)
- Flux CLI (v2.1 or later)
- kubectl configured to access your cluster
- Familiarity with Kubernetes Pod Security Standards

## Step 1: Review the Restricted Pod Security Standard Requirements

The Restricted standard requires the following for all containers:

- `allowPrivilegeEscalation: false`
- `runAsNonRoot: true`
- Capabilities dropped to `ALL` (only `NET_BIND_SERVICE` may be added)
- `seccompProfile.type: RuntimeDefault` or `Localhost`
- No `hostNetwork`, `hostPID`, `hostIPC`
- No privileged containers
- No `hostPath` volumes
- Read-only root filesystem (recommended but not required)

## Step 2: Install Flux with Restricted Security Context Patches

Bootstrap Flux with custom patches to enforce the restricted profile:

```bash
flux install --export > flux-system/gotk-components.yaml
```

Create a Kustomize patch file for the restricted security context:

```yaml
# clusters/my-cluster/flux-system/patches/restricted-security.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: all-flux-controllers
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: manager
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            capabilities:
              drop:
                - ALL
            seccompProfile:
              type: RuntimeDefault
```

Apply this patch to each controller using a kustomization.yaml:

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: Deployment
      name: source-controller
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
              seccompProfile:
                type: RuntimeDefault
            containers:
              - name: manager
                securityContext:
                  allowPrivilegeEscalation: false
                  readOnlyRootFilesystem: true
                  capabilities:
                    drop:
                      - ALL
                  seccompProfile:
                    type: RuntimeDefault
  - target:
      kind: Deployment
      name: kustomize-controller
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
              seccompProfile:
                type: RuntimeDefault
            containers:
              - name: manager
                securityContext:
                  allowPrivilegeEscalation: false
                  readOnlyRootFilesystem: true
                  capabilities:
                    drop:
                      - ALL
                  seccompProfile:
                    type: RuntimeDefault
  - target:
      kind: Deployment
      name: helm-controller
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
              seccompProfile:
                type: RuntimeDefault
            containers:
              - name: manager
                securityContext:
                  allowPrivilegeEscalation: false
                  readOnlyRootFilesystem: true
                  capabilities:
                    drop:
                      - ALL
                  seccompProfile:
                    type: RuntimeDefault
  - target:
      kind: Deployment
      name: notification-controller
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
              seccompProfile:
                type: RuntimeDefault
            containers:
              - name: manager
                securityContext:
                  allowPrivilegeEscalation: false
                  readOnlyRootFilesystem: true
                  capabilities:
                    drop:
                      - ALL
                  seccompProfile:
                    type: RuntimeDefault
```

## Step 3: Apply the Restricted Namespace Label

Label the flux-system namespace with the restricted PSA profile:

```yaml
# clusters/my-cluster/flux-system/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: flux-system
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
```

Apply the namespace configuration:

```bash
kubectl apply -f clusters/my-cluster/flux-system/namespace.yaml
```

## Step 4: Configure Temporary Directories with emptyDir

Since read-only root filesystems prevent writing to the container filesystem, mount writable volumes for temporary data:

```yaml
# Patch for source-controller with temp volumes
- target:
    kind: Deployment
    name: source-controller
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
```

## Step 5: Verify Compliance with the Restricted Profile

Check if the deployed controllers comply with the restricted profile:

```bash
# Check pod security context for each controller
for deploy in source-controller kustomize-controller helm-controller notification-controller; do
  echo "=== $deploy ==="
  kubectl get deployment "$deploy" -n flux-system -o jsonpath='{.spec.template.spec.securityContext}' | jq .
  kubectl get deployment "$deploy" -n flux-system -o jsonpath='{.spec.template.spec.containers[0].securityContext}' | jq .
  echo ""
done
```

## Step 6: Use Flux Bootstrap with Restricted Patches

For new cluster bootstraps, include the restricted patches from the start:

```bash
# Bootstrap Flux with the restricted patches
flux bootstrap github \
  --owner=myorg \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal

# Then add the security patches and push
cd fleet-infra
# Add the kustomization patches from Step 2
git add clusters/production/flux-system/kustomization.yaml
git commit -m "Apply restricted pod security patches to Flux controllers"
git push
```

## Verification

After applying the restricted configuration, verify compliance:

1. Check that all Flux controllers are running:

```bash
flux check
kubectl get pods -n flux-system
```

2. Verify security contexts:

```bash
kubectl get pods -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].securityContext}{"\n"}{end}'
```

3. Test namespace PSA enforcement:

```bash
# Try to create a privileged pod in flux-system (should fail)
kubectl run test --image=nginx \
  --overrides='{"spec":{"containers":[{"name":"test","image":"nginx","securityContext":{"privileged":true}}]}}' \
  -n flux-system
```

4. Verify Flux reconciliation still works:

```bash
flux reconcile kustomization flux-system --with-source
flux get all -A
```

5. Check for PSA audit violations:

```bash
kubectl get events -n flux-system --field-selector reason=FailedCreate | grep -i security
```

## Troubleshooting

### Controller crashes with permission denied errors

If a controller crashes because it cannot write to the filesystem, ensure temporary directories are mounted:

```bash
kubectl logs -n flux-system deploy/source-controller | grep -i "permission denied"
```

Add emptyDir volume mounts for required directories (see Step 4).

### seccomp profile not supported

If your cluster or container runtime does not support seccomp profiles, remove the seccomp requirement:

```yaml
# Remove this from the security context
seccompProfile:
  type: RuntimeDefault
```

Note that this will prevent compliance with the restricted standard.

### Controller cannot bind to ports below 1024

If a controller needs to listen on a port below 1024, the `NET_BIND_SERVICE` capability must be added:

```yaml
securityContext:
  capabilities:
    drop:
      - ALL
    add:
      - NET_BIND_SERVICE
```

This is the only capability allowed under the restricted standard.

### Helm controller fails to render charts

If the helm-controller fails because it cannot write Helm cache files, mount additional writable volumes:

```yaml
volumeMounts:
  - name: helm-cache
    mountPath: /home/nonroot/.cache/helm
  - name: helm-config
    mountPath: /home/nonroot/.config/helm
volumes:
  - name: helm-cache
    emptyDir: {}
  - name: helm-config
    emptyDir: {}
```

### Image pull fails with non-root user

If images require root to run the entrypoint, check that the Flux controller images are built to run as non-root. All official Flux images support running as non-root.

## Summary

Running Flux controllers with the Restricted Pod Security Standard provides the highest level of workload security for your GitOps infrastructure. By configuring security contexts with no privilege escalation, dropped capabilities, read-only root filesystems, and seccomp profiles, you minimize the attack surface of the controllers that manage your cluster. Since Flux controllers are designed to run under restricted conditions, this configuration aligns with both security best practices and the project's design principles.
