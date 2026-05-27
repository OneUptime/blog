# Validation Summary: How to Configure Pod Security Admission Labels for MetalLB Namespace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Pod Security Admission
- Pod Security Standards
- MetalLB
- Helm
- kubectl

## Sources Consulted
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Enforcing Pod Security Standards best practices: https://kubernetes.io/docs/setup/best-practices/enforcing-pod-security-standards/
- Kubernetes admission controller documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- MetalLB upstream native manifest: https://raw.githubusercontent.com/metallb/metallb/main/config/manifests/metallb-native.yaml
- MetalLB upstream Helm chart values: https://raw.githubusercontent.com/metallb/metallb/main/charts/metallb/values.yaml
- MetalLB upstream speaker Helm template: https://raw.githubusercontent.com/metallb/metallb/main/charts/metallb/templates/speaker.yaml

## Issues Found
- The post said `SYS_ADMIN` is needed in some BGP configurations. Current upstream MetalLB uses `NET_RAW` and `hostNetwork` for the speaker, while the deprecated in-pod FRR mode's FRR sidecar requests `NET_ADMIN`, `NET_RAW`, `SYS_ADMIN`, and `NET_BIND_SERVICE`. Updated the wording and diagram to make that mode-specific.
- The stricter `audit=baseline` and `warn=baseline` comments implied they only capture violations beyond what MetalLB needs. Since MetalLB speaker itself violates baseline through `hostNetwork` and `NET_RAW`, updated the comments to explain that expected speaker violations will also be surfaced.
- The Helm section used a `namespace.labels` values snippet, but the upstream MetalLB Helm chart values do not expose that key. Replaced it with commands that create and label the namespace before running `helm upgrade --install`.
- The common-error example used a kubelet/container runtime `runAsNonRoot` image-user error and attributed it to PSA. Replaced it with a Pod Security Admission `Forbidden` example for baseline violations caused by `hostNetwork` and `NET_RAW`.
- The declarative apply command comment recommended server-side apply, but the command omitted `--server-side`. Updated the command to match the comment.
- The verification output omitted version labels and could be read as the complete namespace label set. Updated it to show the relevant PSA labels, including version labels, and clarified that dry-run admission can still emit warnings when `warn` is stricter than `enforce`.

## Review Notes
- The post recommends `enforce=privileged` with optional stricter `audit` and `warn` labels. This is valid, but teams should expect warnings and audit annotations for MetalLB speaker itself when `warn` or `audit` is set to `baseline` or `restricted`.
- The upstream MetalLB native manifest labels the namespace with `enforce`, `audit`, and `warn` all set to `privileged`, which avoids expected PSA warning noise during install.
