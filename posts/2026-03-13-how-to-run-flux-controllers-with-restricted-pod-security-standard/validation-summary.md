# Validation Summary: How to Run Flux Controllers with Restricted Pod Security Standard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Kubernetes
- Pod Security Standards
- Pod Security Admission
- Kustomize
- kubectl

## Sources Consulted
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes namespace labels for Pod Security Admission: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels
- Kubernetes security contexts: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes seccomp documentation: https://kubernetes.io/docs/reference/node/seccomp/
- Flux security documentation: https://fluxcd.io/flux/security/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux installation documentation: https://fluxcd.io/flux/installation/

## Issues Found
- The post implied that current Flux controllers need custom patches to meet the Restricted Pod Security Standard. Flux official manifests already configure the controllers in conformance with the restricted standard, including dropped capabilities, read-only root filesystems, runtime-default seccomp, non-root execution, `fsGroup: 1337`, and UID/GID `65534`. Updated the post to describe the patches as remediation for older or customized manifests.
- The `flux install --export > flux-system/gotk-components.yaml` command wrote to a directory that might not exist. Added `mkdir -p flux-system`.
- The example Kustomization referenced `gotk-sync.yaml`, but the preceding `flux install --export` command only exports the component manifests. Removed that resource from the install-based example.
- The standalone patch used `metadata.name: all-flux-controllers`, which is not a real Flux Deployment name. Changed it to a real controller name and clarified that patches should target individual customized controllers.
- The patch examples did not include Flux's documented default `fsGroup`, `runAsUser`, and `runAsGroup` values. Added `fsGroup: 1337` and UID/GID `65534` to align with Flux's official manifests.
- The Restricted PSS requirement summary said "No hostPath volumes" but did not reflect the restricted volume allowlist. Updated it to list the allowed restricted volume types.
- The troubleshooting guidance suggested removing `seccompProfile` when seccomp was unsupported. Since Restricted PSS requires an allowed seccomp profile for Linux pods, updated the wording to recommend using a runtime and Kubernetes version that support `RuntimeDefault`, with removal only as a non-compliant temporary workaround outside restricted enforcement.
- The "Image pull fails with non-root user" heading was inaccurate because image pull does not depend on the container entrypoint user. Renamed it to a container start failure scenario.
- The bootstrap follow-up command only staged `kustomization.yaml` even though the namespace labels from the preceding step also need to be committed. Updated the command to stage the Flux system directory.

## Review Notes
- The guide is technically relevant and valid after correction. Current Flux releases already ship restricted-compatible controller manifests, so the most important operational step is enabling Pod Security Admission labels on the `flux-system` namespace and verifying any local customizations.
- The local workspace did not have `flux`, `kubectl`, or `kustomize` installed, so CLI syntax was checked against official documentation and current upstream Flux release manifests rather than local `--help` output.
