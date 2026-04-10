# Validation Summary: How to Configure Container Security Context in Rook Helm Chart

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook-Ceph operator Helm chart
- Kubernetes Pod Security Standards (PSS)
- Kubernetes security contexts (pod-level and container-level)
- Helm (upgrade with values files)
- kubectl (namespace labeling, deployment patching, jsonpath queries)

## Sources Consulted
- Rook operator Helm chart `values.yaml` (master branch): https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook operator Helm chart deployment template: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/templates/deployment.yaml
- Rook operator Helm chart documentation: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook Key Management System documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/key-management-system/
- Rook cluster.yaml example: https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/

## Issues Found

### Issue 1: `podSecurityContext` is not a Rook operator Helm chart value
**What was wrong:** The post claimed the Rook operator Helm chart exposes both `podSecurityContext` and `containerSecurityContext` values. In reality, only `containerSecurityContext` is supported. The deployment template does not reference `.Values.podSecurityContext`, so setting it in a values file would be silently ignored.
**What was changed:** Updated the Overview to clarify only `containerSecurityContext` is a chart value. Rewrote the "Operator Pod Security Context" section to explain the limitation and provide a `kubectl patch` alternative for applying pod-level settings like `fsGroup`. Removed the non-functional `podSecurityContext` block from the "Applying the Configuration" values file example.

### Issue 2: Missing `seccompProfile` for restricted Pod Security Standard compliance
**What was wrong:** The post claimed the security context configuration "aligns with all requirements" of the `restricted` Pod Security Standard. However, the `restricted` standard requires `seccompProfile.type` to be set to `RuntimeDefault` or `Localhost`, which was missing from all examples.
**What was changed:** Added `seccompProfile: type: RuntimeDefault` to the `containerSecurityContext` examples in both the "Operator Container Security Context" and "Applying the Configuration" sections. Added a note explaining this is required for the `restricted` standard.

### Issue 3: OSD section showed unrelated `keyRotation` YAML instead of OSD security configuration
**What was wrong:** The "OSD Security Context Considerations" section displayed a `spec.security.keyRotation` YAML snippet from the CephCluster CR. This field controls encryption key rotation (KMS), not OSD security contexts. The advice to "configure it in the cluster CR" was also inaccurate — OSD privileged mode is handled automatically by Rook based on storage type.
**What was changed:** Replaced the incorrect YAML with the correct `hostpathRequiresPrivileged` Helm value, which is the actual operator chart setting for OSD privileged access on platforms with SELinux. Updated the text to explain that Rook handles OSD privileges automatically.

### Issue 4: Verification command checked wrong jsonpath
**What was wrong:** The `kubectl get pod` verification command used jsonpath `{.items[0].spec.securityContext}` which shows the pod-level security context. Since the chart only sets container-level security context, this would not show the configured values.
**What was changed:** Updated to `{.items[0].spec.containers[0].securityContext}` to correctly inspect the container-level security context.

### Issue 5: Missing `runAsGroup` in container security context examples
**What was wrong:** The `containerSecurityContext` examples omitted `runAsGroup: 2016`, which is part of the chart's default values and is a best practice for explicit group control.
**What was changed:** Added `runAsGroup: 2016` to the container security context examples.

## Review Notes
- The `readOnlyRootFilesystem: false` setting shown in the "Operator Container Security Context" section is the Kubernetes default and is technically unnecessary to specify. It is not harmful but adds no value. Left as-is since the accompanying explanation provides useful context.
- The Helm repo name `rook-release` in the `helm upgrade` command is the conventional name but users must have previously added this repo. This is standard practice and not an error.
- The post does not specify a Rook version. The review was performed against the latest (master branch) chart. The `containerSecurityContext` defaults (UID/GID 2016, drop ALL capabilities) have been stable across recent Rook releases.
