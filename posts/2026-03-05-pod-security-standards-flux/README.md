# How to Configure Pod Security Standards for Flux Controllers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, Pod Security Standards, PSS

Description: Learn how to configure Kubernetes Pod Security Standards for Flux CD controllers to enforce secure container runtime defaults.

---

Pod Security Standards (PSS) define three security profiles for Kubernetes pods: Privileged, Baseline, and Restricted. Flux CD controllers should run under the Restricted profile to minimize attack surface. This guide shows you how to configure Pod Security Standards for all Flux CD controllers.

## Understanding Pod Security Standards

Kubernetes defines three Pod Security Standards levels:

- **Privileged**: Unrestricted, allows all configurations.
- **Baseline**: Prevents known privilege escalations while remaining broadly compatible.
- **Restricted**: Heavily restricted, follows hardening best practices.

Flux CD controllers are designed to run under the Restricted profile since they do not need host access, privileged containers, or elevated capabilities.

## Step 1: Label the Flux System Namespace

Apply Pod Security Standards labels to the `flux-system` namespace to enforce the Restricted profile:

```yaml
# namespace-flux-system-pss.yaml
# Enforce the Restricted Pod Security Standard on the flux-system namespace
apiVersion: v1
kind: Namespace
metadata:
  name: flux-system
  labels:
    # Enforce restricted profile - pods violating the policy will be rejected
    pod-security.kubernetes.io/enforce: restricted
    # Warn on restricted violations (logged but not blocked)
    pod-security.kubernetes.io/warn: restricted
    # Audit restricted violations (recorded in audit logs)
    pod-security.kubernetes.io/audit: restricted
    # Pin to a specific Kubernetes version for consistent behavior
    pod-security.kubernetes.io/enforce-version: v1.28
    pod-security.kubernetes.io/warn-version: v1.28
    pod-security.kubernetes.io/audit-version: v1.28
```

Apply the namespace labels:

```bash
# Apply the namespace configuration
kubectl apply -f namespace-flux-system-pss.yaml

# Verify the labels are set
kubectl get namespace flux-system --show-labels
```

## Step 2: Configure Flux Controller Security Contexts

Flux controllers should already have proper security contexts, but you can verify and customize them through Kustomize patches. Create a patch file that sets the Restricted-compliant security context:

```yaml
# patch-security-context.yaml
# Kustomize patch to set Restricted-compliant security contexts on all Flux controllers
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      securityContext:
        # Run as non-root user
        runAsNonRoot: true
        # Use a high UID to avoid conflicts
        runAsUser: 65534
        runAsGroup: 65534
        fsGroup: 65534
        # Set the seccomp profile to RuntimeDefault
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: manager
          securityContext:
            # Prevent privilege escalation
            allowPrivilegeEscalation: false
            # Drop all capabilities
            capabilities:
              drop: ["ALL"]
            # Read-only root filesystem
            readOnlyRootFilesystem: true
```

## Step 3: Apply Patches to All Controllers

Use a Kustomization overlay to apply the security context patch to all Flux controllers:

```yaml
# kustomization.yaml
# Kustomization overlay to patch all Flux controllers with restricted security contexts
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Apply security context to source-controller
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: add
        path: /spec/template/spec/securityContext
        value:
          runAsNonRoot: true
          runAsUser: 65534
          seccompProfile:
            type: RuntimeDefault
      - op: add
        path: /spec/template/spec/containers/0/securityContext
        value:
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
          readOnlyRootFilesystem: true
  # Apply security context to kustomize-controller
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      - op: add
        path: /spec/template/spec/securityContext
        value:
          runAsNonRoot: true
          runAsUser: 65534
          seccompProfile:
            type: RuntimeDefault
      - op: add
        path: /spec/template/spec/containers/0/securityContext
        value:
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
          readOnlyRootFilesystem: true
  # Apply security context to helm-controller
  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      - op: add
        path: /spec/template/spec/securityContext
        value:
          runAsNonRoot: true
          runAsUser: 65534
          seccompProfile:
            type: RuntimeDefault
      - op: add
        path: /spec/template/spec/containers/0/securityContext
        value:
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
          readOnlyRootFilesystem: true
  # Apply security context to notification-controller
  - target:
      kind: Deployment
      name: notification-controller
    patch: |
      - op: add
        path: /spec/template/spec/securityContext
        value:
          runAsNonRoot: true
          runAsUser: 65534
          seccompProfile:
            type: RuntimeDefault
      - op: add
        path: /spec/template/spec/containers/0/securityContext
        value:
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
          readOnlyRootFilesystem: true
```

## Step 4: Verify Pod Security Compliance

After applying the patches, verify that all Flux pods comply with the Restricted profile:

```bash
# Check that all Flux pods are running without security violations
kubectl get pods -n flux-system

# Verify the security context of a specific controller
kubectl get deployment source-controller -n flux-system -o jsonpath='{.spec.template.spec.securityContext}' | jq .

# Verify container-level security context
kubectl get deployment source-controller -n flux-system -o jsonpath='{.spec.template.spec.containers[0].securityContext}' | jq .

# Test that a non-compliant pod would be rejected
kubectl run test-privileged --image=nginx --privileged -n flux-system --dry-run=server
```

## Step 5: Enforce PSS for Tenant Namespaces

If Flux manages tenant namespaces, enforce Pod Security Standards on those namespaces as well:

```yaml
# tenant-namespace-restricted.yaml
# Tenant namespace with Baseline enforcement and Restricted warnings
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-production
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
```

## Handling PSS Violations During Reconciliation

When Flux attempts to deploy resources that violate Pod Security Standards, the reconciliation will fail. Monitor for these failures:

```bash
# Check for PSS-related failures in Flux Kustomizations
flux get kustomizations -A | grep -i false

# Look for specific PSS violation messages in controller logs
kubectl logs -n flux-system deployment/kustomize-controller | grep -i "forbidden\|violat"

# Get events related to PSS violations
kubectl get events -n flux-system --field-selector reason=ReconciliationFailed
```

## Best Practices

1. **Start with warn mode**: Use `pod-security.kubernetes.io/warn: restricted` first to identify violations without blocking deployments.
2. **Upgrade gradually**: Move from Baseline to Restricted enforcement only after verifying all workloads comply.
3. **Pin versions**: Use the `enforce-version` label to avoid unexpected behavior changes during Kubernetes upgrades.
4. **Monitor violations**: Set up alerts for PSS audit log entries to catch non-compliant deployments early.
5. **Use Flux health checks**: Flux Kustomizations and HelmReleases report reconciliation failures, making PSS violations visible in your GitOps workflow.

Configuring Pod Security Standards for Flux controllers ensures that your GitOps infrastructure follows Kubernetes security best practices from the ground up. Combined with RBAC and service account impersonation, PSS provides defense-in-depth for your cluster.
