# Validation Summary: How to Configure Fleet with Branch-Based Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Fleet
- Kubernetes
- Git
- Helm
- GitOps

## Sources Consulted
- Fleet custom resource schema reference: https://fleet.rancher.io/reference/ref-crds
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet Git repository contents and customization behavior: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet deployment tutorial and multi-cluster targeting examples: https://fleet.rancher.io/tutorials/tut-deployment
- Official Fleet example for Helm target customizations: https://github.com/rancher/fleet-examples/blob/master/multi-cluster/helm/fleet.yaml
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The original Step 3 placed `helm.values` under the `GitRepo` spec. Fleet's current `GitRepoSpec` does not support a top-level `helm` field, so those examples were invalid. I corrected the post to place Helm overrides in the branch's bundle-level `fleet.yaml`, which matches Fleet's documented customization model.
- The original cluster-labeling commands used the generic `cluster` resource name. I updated them to `clusters.fleet.cattle.io` to match Fleet's namespaced Cluster CRD explicitly and avoid ambiguity with other cluster-related resources in Rancher environments.
- The original branch layout showed raw YAML-style bundle contents (`deployment.yaml`) while Step 3 used Helm values. I corrected the example repository structure to a Helm chart layout so the `helm.values` examples are consistent with the files shown.

## Review Notes
- The post does not pin a Fleet version. The reviewed examples are consistent with the current Fleet documentation available on April 30, 2026, where the API version for `GitRepo` remains `fleet.cattle.io/v1alpha1`.
- The branch protection snippet is clearly marked conceptual, so it is acceptable as guidance rather than executable configuration.
