# Validation Summary: How to Configure Kubewarden Validation Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubewarden
- Kubernetes admission control
- Kubernetes custom resources
- `kubectl`
- YAML policy manifests
- Kubewarden audit scanner and OpenReports

## Sources Consulted
- Kubewarden CRD reference: https://docs.kubewarden.io/reference/CRDs
- Kubewarden monitor mode reference: https://docs.kubewarden.io/reference/monitor-mode
- Kubewarden audit scanner how-to: https://docs.kubewarden.io/howtos/audit-scanner
- Kubewarden audit scanner reports: https://docs.kubewarden.io/explanations/audit-scanner/policy-reports
- Kubewarden quick start: https://docs.kubewarden.io/quick-start
- Kubewarden `pod-privileged-policy`: https://github.com/kubewarden/pod-privileged-policy
- Kubewarden `user-group-psp-policy`: https://github.com/kubewarden/user-group-psp-policy
- Kubewarden `volumes-psp-policy`: https://github.com/kubewarden/volumes-psp-policy
- Kubewarden `readonly-root-filesystem-psp-policy`: https://github.com/kubewarden/readonly-root-filesystem-psp-policy
- Kubewarden `capabilities-psp-policy`: https://github.com/kubewarden/capabilities-psp-policy
- Kubewarden `ingress-policy`: https://github.com/kubewarden/ingress-policy
- Kubewarden `trusted-repos-policy`: https://github.com/kubewarden/trusted-repos-policy
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post pinned several old policy artifact versions. I updated them to the current official versions published by Kubewarden policy metadata so the examples reflect the current policy artifacts.
- The Ingress example used the wrong module name (`ingress-policy`) and an unsupported setting (`allowedIngressClasses`). I changed it to the official `ingress` artifact and supported settings (`requireTLS` and `denyPorts`).
- The namespace-scoped image policy used a non-current module name (`allowed-image-repositories`) and unsupported settings (`allowedRegistries`). I replaced it with the official `trusted-repos` policy and its supported `images.allow` configuration.
- The monitor-mode apply command was shell-invalid as written because the pipeline was embedded inside `find -exec`. I replaced it with a working `find ... -print0 | while ...` loop.
- The monitoring command relied on `kubectl get events` with `reason=PolicyViolation`, which is not the current Kubewarden reporting path. I updated it to watch the current `Report` CRDs used by the audit scanner.
- The protect-mode promotion command only updated `ClusterAdmissionPolicy` resources, even though the post also introduced namespaced `AdmissionPolicy` resources. I added the namespaced patch loop.
- The policy status JSONPath was incorrect. I changed it from a nonexistent `PolicyActive` condition lookup to the actual `.status.policyStatus` field exposed by the Kubewarden CRDs.

## Review Notes
- Kubewarden policy repositories were merged into the `kubewarden/policies` monorepo starting with Kubewarden 1.32, but the published OCI artifact paths under `ghcr.io/kubewarden/policies/...` remain the correct references for end users.
- Kubewarden 1.33 switched audit scanner output to OpenReports `Report` and `ClusterReport` CRDs by default; older `PolicyReport`-based guidance is now outdated.
- The examples intentionally target low-level resources such as `pods` and `ingresses`. That is technically valid, but higher-level controllers such as `Deployment` are then rejected only when they create the underlying non-compliant resources.
