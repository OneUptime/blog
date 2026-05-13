# Validation Summary: How to Fix Flux Reconciliation After Cluster Upgrade

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux
- Kubernetes
- GitOps
- Kubernetes API deprecations
- Admission webhooks
- kube-no-trouble (kubent)
- Pluto

## Sources Consulted
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes kubectl api-versions reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-versions/
- Flux CLI reference: https://fluxcd.io/flux/cmd/flux/
- Flux install command reference: https://fluxcd.io/flux/cmd/flux_install/
- Flux reconcile source git command reference: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux reconcile kustomization command reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux installation and Kubernetes support documentation: https://fluxcd.io/flux/installation/
- Flux release support policy: https://fluxcd.io/flux/releases/
- kube-no-trouble README and CLI help: https://github.com/doitintl/kube-no-trouble
- Pluto documentation: https://pluto.docs.fairwinds.com/quickstart/ and https://pluto.docs.fairwinds.com/advanced/

## Issues Found
- `kubectl version --short` is no longer present in the current official `kubectl version` reference. Changed it to `kubectl version`.
- The command under "Check for deprecated API usage in your manifests" listed API versions served by the cluster, not deprecated APIs in manifests. Changed the heading and command to `kubectl api-versions`.
- Kubernetes deprecated APIs are removed across minor releases, not major releases. Corrected the wording.
- The Kubernetes v1.26 HPA removal was listed as `autoscaling/v2beta1`; Kubernetes removed `autoscaling/v2beta2` in v1.26. Corrected the version.
- The Ingress v1 migration note incorrectly said `ingressClassName` is required. Kubernetes requires `pathType` for each path and changes backend service fields; corrected the note.
- `flux reconcile source git --all` and `flux reconcile kustomization --all` are not valid according to the current Flux command references. Replaced them with shell loops using `flux get ... --no-header` and per-object reconcile commands.
- `kubent --cluster` is unnecessary because the Cluster collector is enabled by default. Changed the example to `kubent`.

## Review Notes
The guide is technically relevant and accurate after the fixes. Some commands assume Flux resources are in the default `flux-system` namespace; users with multi-namespace Flux installations may need `--all-namespaces` or explicit `--namespace` flags.
