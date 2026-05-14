# Validation Summary: How to Roll Back a Failed Flux CD Upgrade

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CD
- Kubernetes
- kubectl
- GitOps
- Kubernetes CustomResourceDefinitions
- Bash
- yq

## Sources Consulted
- Flux CLI `flux install` documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux upgrade documentation: https://fluxcd.io/flux/installation/upgrade/
- Flux CLI `flux export source git` documentation: https://fluxcd.io/flux/cmd/flux_export_source_git/
- Flux CLI `flux export alert-provider` documentation: https://fluxcd.io/flux/cmd/flux_export_alert-provider/
- Flux CLI `flux export image update` documentation: https://fluxcd.io/flux/cmd/flux_export_image_update/
- Flux CLI `flux get all` documentation: https://fluxcd.io/flux/cmd/flux_get_all/
- Flux CLI `flux get sources all` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_all/
- Flux CLI `flux get images repository` documentation: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Flux CLI `flux get images policy` documentation: https://fluxcd.io/flux/cmd/flux_get_images_policy/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux v2.3.0 install manifest from GitHub releases: https://github.com/fluxcd/flux2/releases/download/v2.3.0/install.yaml
- Kubernetes generated `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The CRD restore command used `--selector=app.kubernetes.io/component=crd`, but Flux CRDs are not labeled with `app.kubernetes.io/component=crd`. Changed the snippet to extract `CustomResourceDefinition` documents with `yq` and pipe them to `kubectl apply`.
- The conversion-webhook recovery snippet used `kubectl replace -f backup/crds.yaml`, which is brittle for restoring a saved CRD manifest. Changed it to `kubectl apply -f backup/crds.yaml`.
- The diagnostics snippet used `kubectl version --short`, but the current generated Kubernetes reference for `kubectl version` lists `--client` and `-o` and no longer includes `--short`. Changed it to `kubectl version`.
- The backup script wrote alert providers to `providers.yaml`, while the restore section expected `alert-providers.yaml`. Changed the backup filename to `alert-providers.yaml`.
- The backup script exported CRDs with `kubectl get crds -o yaml | grep -A 100 'fluxcd.io'`, which can produce incomplete or invalid YAML and miss CRDs. Changed it to select Flux CRDs by the `app.kubernetes.io/part-of=flux` label.
- The backup script comment claimed it exported all Flux resources, but `flux export --all` operates in the selected namespace. Clarified that it exports from the current namespace and should be repeated with `-n` for other namespaces.

## Review Notes
Flux `flux get all` and `flux get sources all` are documented as preview commands, so future Flux versions may change their behavior. Rolling back CRDs can be risky when stored resource versions or schemas changed across releases; the corrected commands are syntactically accurate, but operators should still test rollback paths before production upgrades.
