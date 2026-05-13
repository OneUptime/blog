# Validation Summary: How to Collect Controller Debug Logs for Flux Support Tickets

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Flux CD
- Kubernetes
- kubectl
- Flux CLI
- Kubernetes deployments, pods, logs, events, and custom resources

## Sources Consulted
- Flux logs documentation: https://fluxcd.io/flux/monitoring/logs/
- Flux controller options documentation: https://fluxcd.io/flux/components/source/options/
- Flux helm-controller options documentation: https://fluxcd.io/flux/components/helm/options/
- Flux CLI `flux get sources all` reference: https://fluxcd.io/flux/cmd/flux_get_sources_all/
- Flux CLI `flux reconcile source git` reference: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux CLI `flux reconcile helmrelease` reference: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- `kubectl version --short` is no longer documented in the current Kubernetes kubectl reference. Changed it to `kubectl version -o yaml`, which is supported and captures both client and server version details.
- The all-controller debug patch replaced the entire container `args` list with only logging flags. This could remove existing Flux controller flags such as event, metrics, storage, or watch settings. Changed it to append `--log-level=debug`, matching the Flux documentation pattern for adding a log-level flag.
- The section title said "Custom Resource Definitions" but the commands exported Flux custom resources, not CRD objects. Changed the heading to "Custom Resources."
- The resource export text implied secrets were fully redacted, but the commands only export Flux resource YAML and do limited `password:` redaction. Changed the wording to instruct readers to review for sensitive fields before sharing.
- The diagnostic bundle example evaluated `date` separately for the directory and tarball names. Changed it to use one `DIAG_DIR` variable so the directory and archive names remain consistent.
- The debug-disable command replaced the full controller `args` list with only logging flags, which could remove required or user-configured controller arguments. Changed it to `kubectl rollout undo` for deployments patched by the guide.

## Review Notes
The post is technically relevant and validated after the fixes above. Local `flux` and `kubectl` binaries were not available in the review environment, so command verification was performed against official Flux and Kubernetes documentation.
