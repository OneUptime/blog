# Validation Summary: How to Configure Fleet Cluster Groups

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- `kubectl`
- YAML configuration

## Sources Consulted
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet custom resources reference: https://fleet.rancher.io/reference/ref-crds
- Fleet namespaces explanation: https://fleet.rancher.io/0.8/namespaces
- Fleet target mapping documentation: https://fleet.rancher.io/0.8/gitrepo-targets
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The `fleet.yaml` examples used a top-level `targets:` block with per-target Helm overrides. Fleet documents `overrideTargets` for replacing GitRepo targets and `targetCustomizations` for per-target bundle customization, so the examples were updated to use the documented fields.
- The monitoring example filtered `BundleDeployment` objects by `.spec.clusterGroup`, but `BundleDeploymentSpec` does not include a `clusterGroup` field in the Fleet CRD reference. It was replaced with a `ClusterGroup.status.display` JSONPath query that reports the ClusterGroup's aggregated readiness.
- The command comment `See which clusters are in a group` overstated what the label query proves. It now explicitly says the command lists clusters matching the simple example selector.

## Review Notes
- The examples use `fleet-default`, which is appropriate for Rancher-created workspaces. Standalone Fleet installations may use `fleet-local` or another namespace, so readers should use the namespace that contains their `Cluster`, `ClusterGroup`, and related Fleet resources.
- `kubectl` was not installed in the review workspace, so command syntax was verified against the official Kubernetes command reference rather than local `--help` output.
