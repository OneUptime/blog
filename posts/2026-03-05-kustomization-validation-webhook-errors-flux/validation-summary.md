# Validation Summary: How to Handle Kustomization Validation Webhook Errors in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD Kustomization
- Kubernetes admission webhooks
- Kubernetes validating and mutating webhook configurations
- Kustomize overlays and patches
- kubectl server-side dry-run
- Policy engines such as Kyverno, OPA Gatekeeper, and Kubewarden

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux `flux build kustomization` command documentation: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux `flux reconcile kustomization` command documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/

## Issues Found
- The dry-run incompatibility resolution incorrectly recommended `spec.force: true` as a way to skip server-side dry-run validation. Flux documentation states that `spec.force` recreates resources when patching fails because of immutable field changes; it does not bypass Kubernetes admission dry-run. Replaced the example with a webhook configuration using `sideEffects: NoneOnDryRun` and clarified that Flux does not provide a Kustomization setting to bypass server-side dry-run admission.
- The debugging flowchart repeated the incorrect `force: true` dry-run workaround. Updated it to direct readers to fix webhook `sideEffects` or disable the webhook.
- The conclusion repeated the incorrect `force: true` dry-run workaround. Updated it to recommend configuring webhooks with `sideEffects: None` or `sideEffects: NoneOnDryRun`.
- A webhook connection error was fenced as `json` even though the example is plain text, not JSON. Changed the fence language to `text`.
- The webhook exclusion section implied that excluding `flux-system` excludes all Flux-managed resources. A namespace selector for `flux-system` only excludes resources in that namespace, so the wording was narrowed to Flux control-plane resources.

## Review Notes
The Flux CLI was not installed in the local environment, so CLI syntax was checked against official Flux command documentation rather than local `--help` output. `kubectl` was also not installed locally; Kubernetes webhook behavior and dry-run semantics were verified against official Kubernetes documentation.
