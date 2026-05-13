# Validation Summary: How to Balance Load Across Shard Controllers in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps Toolkit controllers
- Kustomization and HelmRelease custom resources
- Prometheus metrics and PromQL
- Bash scripting

## Sources Consulted
- Flux sharding and horizontal scaling: https://fluxcd.io/flux/installation/configuration/sharding/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Flux Prometheus metrics: https://fluxcd.io/flux/monitoring/metrics/
- Flux Operator sharding documentation: https://fluxoperator.dev/docs/instance/sharding/

## Issues Found
- The shard distribution example counted only Kustomizations and HelmReleases. Flux sharding also requires source objects, and HelmRelease chart-related source objects, to carry the same shard label. I updated the example to count Flux source objects and added a note that referenced source objects must use the same shard label.
- The "average reconciliation time from metrics" example actually read controller logs, not metrics. I changed the wording and comment to describe it as a recent log check.
- The weighted rebalance script stripped non-digits from `.spec.interval`, which misread values such as `10m0s` as `100`. I replaced that with interval parsing for `h`, `m`, and `s` units and compare weights in seconds.
- The dynamic rebalance script described its threshold as max/avg while the code used max/(min+1). I corrected the comment.
- The dynamic rebalance script said it queried Prometheus while it directly scraped the controller metrics endpoint. I corrected the comment.
- The metrics grep pattern looked for `workqueue_depth ` and would miss normal Prometheus samples with labels, such as `workqueue_depth{name="..."}`. I changed it to match metric lines that start with `workqueue_depth`.
- The PromQL examples filtered on `job=~".*shard.*"`, which is not guaranteed to identify Flux shard pods. I updated the examples to filter by shard pod name and group reconciliation rate by pod and controller.

## Review Notes
- The examples assume controller Pod labels follow the `app=kustomize-controller-shard-1` style. Flux's official examples use shard names like `shard1` and generate labels such as `kustomize-controller-shard1`; users should align the shard values and selectors with their actual installation.
- The round-robin, weighted, team, and dynamic scripts still rebalance Kustomizations only. For production use, paired source objects and HelmRelease chart metadata should be updated in the same operation so all dependent Flux resources remain on the same shard.
