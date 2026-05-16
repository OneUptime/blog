# Validation Summary: How to Migrate Workloads Between Talos Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux / talosctl
- Kubernetes / kubectl
- Velero (with AWS plugin, CSI Snapshot Data Movement, node-agent)
- Flux v2 (source-controller, kustomize-controller)
- Restic (file system backup tool)
- yq (YAML processor, v4 syntax)
- AWS S3 (backup storage)
- Bash shell scripting

## Sources Consulted
- Velero CSI Snapshot Data Movement docs — https://velero.io/docs/main/csi-snapshot-data-movement/
- Velero Customize Installation docs — https://velero.io/docs/main/customize-installation/
- Velero issue #6870 (`--snapshot-move-data` in v1.12) — https://github.com/vmware-tanzu/velero/issues/6870
- Velero issue #7160 (`--use-restic` removal) — https://github.com/vmware-tanzu/velero/issues/7160
- Velero AWS plugin v1.8.0 release — https://github.com/vmware-tanzu/velero-plugin-for-aws/releases/tag/v1.8.0
- Talos System Extensions docs — https://www.talos.dev/v1.11/talos-guides/configuration/system-extensions/
- Flux Kustomization API reference — https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux FAQ (v1 GA API versions) — https://fluxcd.io/flux/faq/
- kubectl reference — https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Restic documentation — https://restic.readthedocs.io/

## Issues Found
No technical issues found.

Specific items verified against current documentation:
- `velero install --use-node-agent` is the correct flag (replaced `--use-restic` in Velero v1.10).
- `velero backup create --snapshot-move-data` is a valid flag (introduced in Velero v1.12 for CSI Snapshot Data Movement).
- `velero/velero-plugin-for-aws:v1.8.0` is a real, published image tag.
- `apiVersion: source.toolkit.fluxcd.io/v1` and `kustomize.toolkit.fluxcd.io/v1` are both GA API versions in Flux v2.
- `talosctl get extensions` is the correct command to list installed Talos system extensions (queries the ExtensionStatus resource).
- yq v4 `del()` syntax with `-i` for in-place edits is correct.
- All kubectl commands and flags (`--context`, `--all-namespaces`, `wait --for=condition=ready`, `api-resources --verbs=list`, etc.) are valid.
- The Pod manifest uses correct API version (`v1`), valid `volumeMounts`/`volumes`/`env`/`secretKeyRef` field structures.
- The Flux GitRepository and Kustomization manifests use correct field names (`interval`, `url`, `ref.branch`, `sourceRef`, `path`, `prune`).

## Review Notes
- The script that loops over `kubectl api-resources --verbs=list -o name` and runs `kubectl get "$resource" --all-namespaces` will work, but some cluster-scoped resources will silently ignore `--all-namespaces`. This is acceptable for a cataloguing script but worth noting.
- The `clean-manifests.sh` script assumes all exported YAML files contain a `List` (i.e., `.items[]`). Since the export step uses `kubectl get <resource> -n <ns> -o yaml` (which returns a `List`), this assumption holds. If a future revision exports single resources, the yq expression would need to be adapted.
- When using `--snapshot-move-data` with Velero, the default Kopia data mover is used. Users may want additional configuration (e.g., a `VolumeSnapshotClass` with the appropriate `velero.io/csi-volumesnapshot-class` label) — outside the scope of this post but worth mentioning in a future revision.
- Velero AWS plugin v1.8.0 is valid but not the latest; the post may want to mention that users should consult the plugin compatibility matrix to match their Velero version.
- The restore command relies on an auto-generated name (`migrate-my-app-20260303120000`); users should grab the actual name from `velero restore get` output rather than assume the timestamp.
