# Validation Summary: How to Configure Fleet Raw YAML Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- GitOps
- YAML
- Helm

## Sources Consulted
- Fleet documentation, "Git Repository Contents": https://fleet.rancher.io/explanations/gitrepo-content
- Fleet documentation, "`fleet.yaml`": https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet documentation, "Mapping to Downstream Clusters": https://fleet.rancher.io/0.10/how-tos-for-users/gitrepo-targets
- Helm documentation, "Charts": https://helm.sh/docs/topics/charts/

## Issues Found
- The post said Fleet handled raw YAML by applying manifests directly with `kubectl apply`. I corrected this to match Fleet's documented raw-YAML scanning behavior and removed the `kubectl apply` claim, because Fleet packages scanned paths into bundles and deploys them through its Helm-based engine.
- The `fleet.yaml` example used `targets:` inside the bundle config. I replaced that with an `overrideTargets` example and clarified that bundle-level `fleet.yaml` config is separate from `GitRepo.spec.targets`, because current Fleet documentation does not define `targets` as a valid `fleet.yaml` field.
- The per-cluster raw YAML example used `kustomize.patches` in `fleet.yaml`. I replaced it with the documented raw-YAML approach using `targetCustomizations` plus `yaml.overlays`, and added the matching `overlays/staging/deployment_patch.yaml` example.
- The post claimed alphabetical filenames control deployment order. I corrected that language so file naming is presented as a readability aid rather than an ordering guarantee, which better matches Fleet's Helm-based deployment model.

## Review Notes
- The examples assume a multi-cluster Rancher workspace because the `GitRepo` is created in `fleet-default`; single-cluster Fleet setups typically use `fleet-local`.
- The `kubectl describe bundle k8s-configs-apps-frontend` example depends on Fleet's default bundle naming convention, which is derived from the `GitRepo` name and scanned path.
