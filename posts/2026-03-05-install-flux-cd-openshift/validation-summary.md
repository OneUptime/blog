# Validation Summary: How to Install Flux CD on OpenShift

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Flux CD
- Flux CLI bootstrap
- Kubernetes custom resources
- Kustomize patches
- Red Hat OpenShift
- OpenShift Security Context Constraints (SCCs)
- OpenShift Routes
- GitHub personal access tokens

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux CLI installation documentation: https://fluxcd.io/flux/cmd/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux bootstrap customization documentation: https://fluxcd.io/flux/installation/configuration/bootstrap-customization/
- Flux webhook receivers guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux v2.7 release notes and supported versions: https://fluxcd.io/blog/2025/09/flux-v2.7.0/
- Red Hat OpenShift 4.11 seccomp and restricted-v2 SCC documentation: https://docs.redhat.com/documentation/enus/openshift_container_platform/4.11/html/security_and_compliance/seccomp-profiles
- Red Hat OpenShift 4.12 release notes / Kubernetes 1.25 compatibility: https://docs.redhat.com/en/documentation/openshift_container_platform/4.12/html/release_notes/ocp-4-12-release-notes
- Red Hat OpenShift 4.13 release notes / Kubernetes 1.26 compatibility: https://docs.redhat.com/en/documentation/openshift_container_platform/4.13/html/release_notes/ocp-4-13-release-notes

## Issues Found
- The prerequisite originally said the guide was for OpenShift 4.12+ without qualifying Flux version compatibility. Current upstream Flux releases support only current Kubernetes minor versions, while OpenShift 4.12 and 4.13 map to Kubernetes 1.25 and 1.26. Updated the prerequisite and pre-flight check guidance to require a Flux release compatible with the cluster's Kubernetes version.
- The SCC section implied Flux controllers generally need `nonroot-v2` or `restricted-v2`. Current Flux manifests already include non-root, no privilege escalation, dropped capabilities, and runtime default seccomp settings that work with OpenShift 4.11+ `restricted-v2` defaults. Updated the wording to make explicit SCC grants a custom-policy fallback.
- The bootstrap patch example created `flux-patches/patch-security-context.yaml`, but the `flux bootstrap github` command had no option that used that file. Replaced it with Flux's documented bootstrap customization pattern using `clusters/openshift-cluster/flux-system/kustomization.yaml` with Kustomize patches targeting Flux deployments.
- The OperatorHub note described CLI bootstrap as the officially recommended Flux approach. Current Flux documentation also covers other installation paths, including operator-based management, so the wording was changed to say CLI bootstrap is a documented approach that gives direct control over generated manifests.
- The monitoring note implied `ServiceMonitor` resources are always available. Updated it to clarify that this depends on user workload monitoring or compatible Prometheus Operator CRDs being available.

## Review Notes
The Flux install script, `flux check --pre`, `flux bootstrap github`, `--components-extra`, Flux `GitRepository` and `Kustomization` API versions, OpenShift Route shape, webhook receiver service name and port, podinfo sample path, SCC inspection command, and uninstall commands were reviewed and are technically valid with the version-compatibility caveat noted above.
