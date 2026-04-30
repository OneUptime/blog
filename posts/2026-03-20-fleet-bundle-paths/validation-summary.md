# Validation Summary: How to Customize Fleet Bundle Paths

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- GitOps
- Helm
- Kustomize

## Sources Consulted
- Fleet docs: Git Repository Contents - https://fleet.rancher.io/explanations/gitrepo-content
- Fleet docs: `fleet.yaml` reference - https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet docs: Bundle Resource reference - https://fleet.rancher.io/reference/ref-bundle
- Fleet docs: Custom Resources Spec - https://fleet.rancher.io/reference/ref-crds
- Fleet source: `GitRepoSpec` - https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/gitrepo_types.go
- Fleet source: `BundleSpec` - https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/bundle_types.go
- Fleet source: bundle creation and path scanning logic - https://github.com/rancher/fleet/blob/main/internal/cmd/cli/apply/apply.go

## Issues Found
- The post said Fleet converts each qualifying directory into a separate Bundle. I corrected this to match Fleet’s scanning behavior: each `spec.paths` entry is scanned independently, and nested raw YAML without its own `fleet.yaml` stays in the parent bundle.
- The nested `fleet.yaml` examples used `targets` to limit deployment to a different set of clusters. I changed these to `overrideTargets`, because Fleet continues to inherit the parent GitRepo targets unless they are explicitly overridden.
- The `kubectl` verification examples referenced `.spec.source.git.path`, which is not part of the Bundle schema. I replaced those commands with valid checks based on the GitRepo label and `spec.resources[*].name`.
- The sample `kubectl get bundles` output showed a `NAMESPACE` column that does not match Fleet’s Bundle print columns. I updated the example output to reflect the actual Bundle columns.

## Review Notes
- `kubectl` was not installed in the local environment, so command verification was done against Fleet’s CRD schema, generated print columns, and controller source rather than live CLI execution.
- The bundle file-listing command uses `.spec.resources[*].name`, which matches Fleet’s default etcd-backed bundle storage. If OCI-backed bundle storage is enabled, bundle contents are referenced through `contentsId` instead of inline resources.
