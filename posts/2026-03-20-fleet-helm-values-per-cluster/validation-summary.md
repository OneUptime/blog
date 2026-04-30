# Validation Summary: How to Configure Fleet Helm Values per Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Helm
- Kubernetes
- kubectl

## Sources Consulted
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet Git repository contents and Helm values documentation: https://fleet.rancher.io/explanations/gitrepo-content
- Rancher Fleet `FleetYAML` schema: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/fleetyaml.go
- Rancher Fleet Helm option schema: https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/bundledeployment_types.go
- Rancher Fleet option merge logic: https://github.com/rancher/fleet/blob/main/internal/cmd/controller/options/calculate.go
- `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic

## Issues Found
- The post used `targets:` inside `fleet.yaml` examples. Fleet uses `targetCustomizations:` for per-cluster customization in `fleet.yaml`, so I corrected all affected snippets.
- The values precedence section omitted `helm.valuesFrom` and described target overrides too narrowly. I updated the merge model so it reflects Fleet’s documented value sources and target-level Helm overrides.
- The cluster-label example used unsupported placeholders such as `${CLUSTER_LABEL_env}`. Fleet uses `${ }` templating with `.ClusterLabels`, so I replaced that snippet with valid Fleet template expressions and guarded missing labels.
- The secrets example implied creating `valuesFrom` secrets in `fleet-default` on the manager cluster. Fleet reads `valuesFrom` from downstream clusters, so I corrected the commands to use downstream cluster contexts and aligned the referenced namespace in `secretKeyRef`.
- The prerequisites section only mentioned manager-cluster `kubectl` access, but the post’s verification and secret examples require downstream cluster access as well. I updated that prerequisite.

## Review Notes
- Fleet evaluates `targetCustomizations` in order and applies the first matching entry per cluster. The examples are safe because their selectors are mutually exclusive.
- Verification of target-level `helm.valuesFiles` required checking the official Fleet schema and merge logic in the upstream repository because the reference page’s supported-customizations table does not list that field explicitly.
