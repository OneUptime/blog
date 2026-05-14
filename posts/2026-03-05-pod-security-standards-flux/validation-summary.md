# Validation Summary: How to Configure Pod Security Standards for Flux Controllers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pod Security Standards
- Kubernetes Pod Security Admission
- Kubernetes security contexts
- Flux CD controllers
- Kustomize patches
- kubectl and flux CLI commands

## Sources Consulted
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes namespace labels for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Flux security documentation: https://fluxcd.io/flux/security/
- Flux bootstrap customization documentation: https://fluxcd.io/flux/installation/configuration/bootstrap-customization/
- Flux v2.8.7 install manifest: https://github.com/fluxcd/flux2/releases/download/v2.8.7/install.yaml

## Issues Found
- The controller security context examples used `fsGroup: 65534`. Flux official security documentation and current install manifests use `fsGroup: 1337`, while the controller user/group is `65534`. Updated the examples to use `fsGroup: 1337` and clarified the UID/GID comment.
- The Kustomize overlay claimed to patch all Flux controllers but only listed four named deployments. Updated it to use the official Flux label selector pattern, `app.kubernetes.io/part-of=flux`, so it applies to all Flux controller deployments in the rendered manifests.
- The Pod Security Admission version labels pinned to Kubernetes `v1.28`, which is outdated for the current Kubernetes documentation reviewed on 2026-05-14. Updated the examples to `v1.36`.

## Review Notes
- The post is technically relevant and contains working Kubernetes and Flux configuration examples after the corrections.
- Flux controllers are already shipped with Restricted-compliant security contexts, so these patches are mainly useful for verification, customization, or restoring the intended settings if local overlays changed them.
- `kubectl` and `flux` binaries were not installed in the local workspace, so CLI syntax was checked against official command references instead of local `--help` output.
