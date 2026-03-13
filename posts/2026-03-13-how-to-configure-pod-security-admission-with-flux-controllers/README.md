# How to Configure Pod Security Admission with Flux Controllers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Pod Security, PSA, Pod Security Admission, Namespace Security

Description: Learn how to configure Kubernetes Pod Security Admission (PSA) labels on namespaces managed by Flux to enforce pod security standards.

---

Kubernetes Pod Security Admission (PSA) is a built-in admission controller that enforces Pod Security Standards at the namespace level. When using Flux to manage your cluster, you can configure PSA labels on namespaces through GitOps to ensure consistent pod security policies across your environments. This guide walks you through configuring Pod Security Admission with Flux controllers.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster (v1.25 or later, where PSA is stable)
- Flux CLI installed and bootstrapped on the cluster
- kubectl configured to access your cluster
- A Git repository connected to Flux

## Step 1: Understand Pod Security Standards

Kubernetes defines three Pod Security Standards:

- **Privileged**: Unrestricted policy, providing the widest possible level of permissions
- **Baseline**: Minimally restrictive policy that prevents known privilege escalations
- **Restricted**: Heavily restricted policy following current pod hardening best practices

Each standard can be applied in three modes:

- **enforce**: Violations cause pod rejection
- **audit**: Violations are recorded in audit logs but pods are admitted
- **warn**: Violations trigger user-facing warnings but pods are admitted

## Step 2: Configure PSA Labels on Application Namespaces

Create namespace definitions with PSA labels managed through Flux:

```yaml
# clusters/my-cluster/namespaces/production.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
```

```yaml
# clusters/my-cluster/namespaces/staging.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
```

```yaml
# clusters/my-cluster/namespaces/development.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
```

## Step 3: Configure the Flux System Namespace

Configure the flux-system namespace with appropriate PSA labels:

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

Since Flux controllers are designed to run under the restricted profile, this should work without modifications to the Flux installation.

## Step 4: Create a Kustomization to Manage Namespaces

Use a Flux Kustomization to manage all namespace definitions:

```yaml
# clusters/my-cluster/namespaces/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - production.yaml
  - staging.yaml
  - development.yaml
```

```yaml
# clusters/my-cluster/namespaces-sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: namespaces
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/namespaces
  prune: false
  force: true
```

## Step 5: Apply PSA Labels Across Multiple Clusters

For multi-cluster environments, create a base configuration and overlay per cluster:

```yaml
# base/namespaces/production.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
```

```yaml
# clusters/production-cluster/namespaces/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../base/namespaces/production.yaml
patches:
  - target:
      kind: Namespace
      name: production
    patch: |
      apiVersion: v1
      kind: Namespace
      metadata:
        name: production
        labels:
          pod-security.kubernetes.io/enforce: restricted
```

```yaml
# clusters/dev-cluster/namespaces/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../base/namespaces/production.yaml
patches:
  - target:
      kind: Namespace
      name: production
    patch: |
      apiVersion: v1
      kind: Namespace
      metadata:
        name: production
        labels:
          pod-security.kubernetes.io/enforce: baseline
```

## Step 6: Gradually Roll Out Restricted PSA

Implement a phased rollout from warn to enforce:

Phase 1 - Start with warnings only:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
```

Phase 2 - Add audit logging:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
```

Phase 3 - Enable enforcement:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
```

## Verification

After applying the configurations, verify PSA is active:

1. Check namespace labels:

```bash
kubectl get namespace production --show-labels
kubectl get namespace staging --show-labels
kubectl get namespace flux-system --show-labels
```

2. Test enforcement with a privileged pod:

```bash
# This should be rejected in the production namespace
kubectl run test-privileged --image=nginx \
  --overrides='{"spec":{"containers":[{"name":"test","image":"nginx","securityContext":{"privileged":true}}]}}' \
  -n production

# Expected error: pods "test-privileged" is forbidden: violates PodSecurity "restricted:latest"
```

3. Test with a compliant pod:

```bash
kubectl run test-compliant --image=nginx \
  --overrides='{"spec":{"securityContext":{"runAsNonRoot":true,"seccompProfile":{"type":"RuntimeDefault"}},"containers":[{"name":"test","image":"nginx","securityContext":{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]}}}]}}' \
  -n production --dry-run=server
```

4. Check audit logs for PSA violations:

```bash
kubectl logs -n kube-system -l component=kube-apiserver | grep "pod-security"
```

## Troubleshooting

### Flux controllers fail to start after applying restricted PSA

If Flux controllers do not meet the restricted profile requirements, temporarily use baseline:

```yaml
metadata:
  name: flux-system
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/warn: restricted
```

Then update Flux controller security contexts to comply with restricted profile.

### Existing pods are not affected by PSA changes

PSA only validates pods at creation time. Existing pods continue running even if they violate the new policy. To enforce compliance on existing pods, delete and recreate them:

```bash
kubectl rollout restart deployment -n production
```

### Namespace labels are being overwritten

Ensure your Flux Kustomization has `force: true` to overwrite labels, and check that no other controller is modifying namespace labels:

```bash
kubectl get namespace production -o yaml | grep -A5 "labels:"
```

### Warning messages in kubectl output

Warning messages from PSA are informational and indicate pods that would violate stricter policies. Review and fix these before moving to enforce mode:

```bash
# See warnings when creating pods
kubectl apply -f deployment.yaml -n production 2>&1 | grep "Warning"
```

## Summary

Configuring Pod Security Admission with Flux controllers provides a GitOps-native approach to enforcing pod security standards across your Kubernetes cluster. By managing PSA namespace labels through Flux, you gain version-controlled, auditable security policies that are consistently applied across all environments. The phased rollout approach from warn to audit to enforce allows you to identify and fix non-compliant workloads before enforcement blocks them, minimizing disruption while improving security.
