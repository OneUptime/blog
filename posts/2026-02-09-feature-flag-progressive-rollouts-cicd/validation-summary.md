# Validation Summary: How to Use Feature Flag-Based Progressive Rollouts from CI/CD to Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenFeature
- flagd
- Kubernetes Deployments, Services, ConfigMaps, CronJobs, Jobs, and Services
- GitHub Actions CI/CD
- Docker
- Node.js
- Python
- Prometheus / PromQL
- Grafana dashboards

## Sources Consulted
- flagd flag definitions documentation: https://flagd.dev/reference/flag-definitions/
- flagd fractional targeting operation documentation: https://flagd.dev/reference/custom-operations/fractional-operation/
- flagd sync configuration documentation: https://flagd.dev/reference/sync-configuration/
- flagd CLI start documentation: https://flagd.dev/reference/flagd-cli/flagd_start/
- flagd Node.js provider documentation: https://flagd.dev/providers/nodejs/
- OpenFeature Python SDK tutorial: https://openfeature.dev/docs/tutorials/getting-started/python/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes kubectl create job reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_job/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Prometheus PromQL querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- actions/checkout official repository: https://github.com/actions/checkout

## Issues Found
- The original flagd targeting rule used non-existent `$flagd.random` and `rolloutPercentage` fields and returned a nested expression that would not produce a valid flag variant. Replaced it with flagd's documented `fractional` operation using `$flagd.flagKey` and `targetingKey`, with `on` and `off` weights.
- The CI/CD ConfigMap patch used the same invalid rollout shape. Updated it to write a valid flagd schema document and represent 0% rollout as `["on", 0]` and `["off", 100]`.
- The Python OpenFeature import path was stale. Updated it from `openfeature.provider.flagd` to the documented `openfeature.contrib.provider.flagd`.
- The GitHub Actions example used `actions/checkout@v3`, which is outdated for current runners. Updated it to `actions/checkout@v6`.
- The progressive rollout script referenced an undefined `current_percentage`, did not update the ConfigMap, and queried metrics that were inconsistent with the metric emitted later in the post. Implemented ConfigMap read/update logic with the Kubernetes Python client and changed the PromQL query to use `feature_flag_evaluations_total` with the documented labels from the app example.
- The rollout CronJob used a Python image without installing required third-party packages. Updated the command to install `requests` and `kubernetes` before running the script.
- The Grafana rollout percentage panel referenced a metric that was never emitted by the post's examples. Updated it to derive the observed rollout share from `feature_flag_evaluations_total`.
- The kill switch JSON patch replaced the flag with an invalid flagd definition missing required `variants`. Updated it to keep a complete disabled flag definition and removed the unnecessary flagd Deployment restart because flagd watches file-based sources and Kubernetes eventually updates mounted ConfigMaps.

## Review Notes
- `kubectl` was not installed in the local environment, so Kubernetes command validation was performed against official Kubernetes generated reference documentation.
- The rollout controller ServiceAccount still needs RBAC permissions to read and patch the `feature-flags` ConfigMap in a real cluster.
- Installing Python dependencies at CronJob runtime is acceptable for an illustrative example, but a production rollout controller should use a prebuilt image with pinned dependencies.
