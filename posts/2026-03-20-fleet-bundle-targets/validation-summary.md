# Validation Summary: How to Configure Fleet Bundle Targets

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- GitOps
- `kubectl`
- YAML configuration

## Sources Consulted
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet Git repository contents explanation: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet custom resources specification: https://fleet.rancher.io/reference/ref-crds
- Fleet list of deployed resources: https://fleet.rancher.io/reference/ref-resources
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Fleet source for `fleet.yaml` schema: https://raw.githubusercontent.com/rancher/fleet/main/pkg/apis/fleet.cattle.io/v1alpha1/fleetyaml.go
- Fleet source for `GitRepoSpec` and `GitTarget`: https://raw.githubusercontent.com/rancher/fleet/main/pkg/apis/fleet.cattle.io/v1alpha1/gitrepo_types.go
- Fleet source for bundle deployment options: https://raw.githubusercontent.com/rancher/fleet/main/pkg/apis/fleet.cattle.io/v1alpha1/bundledeployment_types.go

## Issues Found
- The post used `targets:` throughout `fleet.yaml` examples where current Fleet expects `overrideTargets` for overriding inherited bundle targets and `targetCustomizations` for per-target customization. I updated the examples and surrounding explanation to match the current Fleet schema.
- The introduction implied that `fleet.yaml` and `GitRepo` configure targets in the same way. I corrected this to distinguish `GitRepo.spec.targets`, `fleet.yaml overrideTargets`, and `fleet.yaml targetCustomizations`.
- The namespace-isolation example used `targetNamespace` inside `fleet.yaml` target entries. In Fleet’s current schema, per-target overrides in `fleet.yaml` use `namespace`, so I corrected those examples.
- The cluster labeling and inspection commands used ambiguous short resource names such as `cluster`, `bundle`, and `bundledeployment`. I updated them to the canonical Fleet CRD resource names where precision matters: `clusters.fleet.cattle.io`, `bundles.fleet.cattle.io`, and `bundledeployments.fleet.cattle.io`.
- The target-verification example relied on `kubectl describe ... | grep` to inspect targets. I replaced it with `kubectl get ... -o yaml`, which matches the official Kubernetes and Fleet inspection approach and avoids relying on human-formatted describe output.

## Review Notes
- The examples assume a Rancher-managed multi-cluster setup where downstream cluster resources live in `fleet-default`. In standalone Fleet or custom workspace layouts, the namespace holding `clusters.fleet.cattle.io` resources may differ.
