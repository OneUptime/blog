# Validation Summary: How to Configure Flux CD Log Levels for Debugging

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CD
- Kubernetes
- kubectl
- Kustomize
- Fluent Bit
- Loki

## Sources Consulted
- Flux logs documentation: https://fluxcd.io/flux/monitoring/logs/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux CLI `flux logs` reference: https://fluxcd.io/flux/cmd/flux_logs/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The command labeled "Filter for specific reconciliation events" used `grep "Reconciling"`, which can miss the documented Flux log wording such as "Reconciliation finished". Changed it to `grep -i "reconcil"` so it matches common reconciliation-related log messages case-insensitively.
- The command labeled "View logs with timestamps for the last 10 minutes" used `--since=10m` but did not include Kubernetes' `--timestamps` flag. Added `--timestamps` so the command matches the description.

## Review Notes
The Flux controller claims were verified against current Flux documentation. The documented controller flags `--log-level` and `--log-encoding` are current, and the documented controller log-level values are `trace`, `debug`, `info`, and `error`. Directly replacing the full container `args` array works only when the listed arguments match the installed controller manifest; in production, patching the existing log-level argument or using the Flux bootstrap customization pattern is safer when additional controller flags are present.
