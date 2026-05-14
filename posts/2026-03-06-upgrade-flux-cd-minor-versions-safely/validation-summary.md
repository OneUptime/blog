# Validation Summary: How to Upgrade Flux CD Minor Versions Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Flux CLI
- Flux Toolkit controllers and CRDs
- Flux notification-controller alerts and providers

## Sources Consulted
- Flux release documentation: https://fluxcd.io/flux/releases/
- Flux upgrade documentation: https://fluxcd.io/flux/installation/upgrade/
- Flux CLI `flux version` reference: https://fluxcd.io/flux/cmd/flux_version/
- Flux CLI `flux check` reference: https://fluxcd.io/flux/cmd/flux_check/
- Flux CLI `flux install` reference: https://fluxcd.io/flux/cmd/flux_install/
- Flux CLI `flux get all` reference: https://fluxcd.io/flux/cmd/flux_get_all/
- Flux CLI `flux reconcile kustomization` reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- `flux version --available` is not a documented Flux CLI option. Replaced it with `flux check --pre`, which the official upgrade documentation says reports whether a newer Flux version is available.
- The CRD backup command used `grep -A 5`, which would create a partial and invalid YAML backup. Replaced it with a command that selects Flux CRDs by name and exports the full YAML.
- The preview comparison used `diff` between current Deployments and a full Flux install manifest, which is not a meaningful manifest comparison. Changed it to review the generated manifest directly.
- `flux install --crds=CreateReplace` is not a documented `flux install` option. Replaced it with `kubectl apply --server-side -f flux-upgrade-preview.yaml` to apply the generated manifests, including CRDs.
- The Alert and Provider snippets used `notification.toolkit.fluxcd.io/v1`, but Alert and Provider are documented as `notification.toolkit.fluxcd.io/v1beta3`. Updated both API versions.
- The Slack Provider example mixed a webhook-style secret name with a channel configuration. Updated it to the documented Slack API form with `address: https://slack.com/api/chat.postMessage` and a bot token secret reference.
- The API migration example showed the same `apiVersion` before and after. Updated the "before" HelmRepository to `source.toolkit.fluxcd.io/v1beta2` and kept the "after" version at `source.toolkit.fluxcd.io/v1`.
- `flux reconcile kustomization --all` is not documented for the reconcile command. Replaced it with reconciliation of a specific Kustomization using `--with-source`.

## Review Notes
The guide remains version-sensitive. Flux supports upgrades between Flux v2 releases, but users should still review changelogs for migration notes and use the latest patch release in the target minor series.
