# Validation Summary: How to Install Kubewarden on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubewarden
- Kubernetes
- Helm
- WebAssembly (Wasm)
- Rego
- Kubernetes admission webhooks

## Sources Consulted
- Kubewarden Quick Start: https://docs.kubewarden.io/quick-start
- Kubewarden Certificate Rotation: https://docs.kubewarden.io/explanations/certificates
- Kubewarden Production Deployments: https://docs.kubewarden.io/howtos/production-deployments
- Kubewarden Air Gap Installation: https://docs.kubewarden.io/howtos/airgap/install
- Kubewarden Upgrade Path: https://docs.kubewarden.io/reference/upgrade-path
- Kubewarden CRD Reference: https://docs.kubewarden.io/reference/CRDs
- `kubewarden-controller` chart values: https://raw.githubusercontent.com/kubewarden/helm-charts/main/charts/kubewarden-controller/values.yaml
- `kubewarden-defaults` chart values: https://raw.githubusercontent.com/kubewarden/helm-charts/main/charts/kubewarden-defaults/values.yaml
- `kubewarden-crds` chart values: https://raw.githubusercontent.com/kubewarden/helm-charts/main/charts/kubewarden-crds/values.yaml
- `kubewarden-crds` chart metadata: https://raw.githubusercontent.com/kubewarden/helm-charts/main/charts/kubewarden-crds/Chart.yaml

## Issues Found
- The post incorrectly stated that cert-manager is required for Kubewarden webhooks. I updated the prerequisites, installation step, and conclusion to reflect current Kubewarden behavior: since v1.17.0, the controller manages certificates itself.
- The introduction listed specific policy languages in a way that was outdated and incomplete. I corrected it to the current supported model: policies can be written in any language that compiles to WebAssembly, and Kubewarden also supports Rego-based policies.
- The prerequisites overstated minimum versions. I updated them to Kubernetes v1.19+ and Helm v3+ to match the current chart requirements.
- The architecture overview omitted the audit scanner and understated what the controller manages. I corrected those component descriptions.
- The CRD installation step used a separate namespace creation command and mislabeled the namespace in the comment. I aligned it with the current chart installation flow by using `--create-namespace` on the CRD chart install.
- The `kubectl get policyserver` and `kubectl describe policyserver default` commands omitted the `kubewarden` namespace even though `PolicyServer` is namespaced. I fixed both commands.
- The verification section claimed a Pod `--dry-run=server` test would confirm the admission webhook was working immediately after install. That is misleading without installing a policy that targets Pods, so I removed that test and kept verification focused on installed Kubewarden components and webhook registrations.
- The production Helm values for the controller were incorrect. I replaced `controller.resources.*` and `controller.replicaCount` with the current chart keys `resources.controller.*` and `replicas`.
- The policy server production example only scaled replicas. I added the correct `policyServer.requests.*` and `policyServer.limits.*` values to match the section’s stated purpose.
- The air-gapped example used the wrong registry override key (`global.imageRegistry`). I corrected it to `global.cattle.systemDefaultRegistry` and added the matching `kubewarden-defaults` installation example.

## Review Notes
- The upgrade order in the post is correct: upgrade CRDs first, then the controller, then the default policy server.
- Kubewarden documentation currently expects the stack components to stay on the same Kubewarden release line during upgrades, even though the Helm chart version numbers themselves differ by chart.
- The `kubewarden-crds` chart currently installs OpenReports CRDs by default (`installOpenReportsCRDs: true`) and does not install deprecated PolicyReport CRDs by default (`installPolicyReportCRDs: false`).
