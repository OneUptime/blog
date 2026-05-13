# Validation Summary: How to Integrate Chaos Experiments with Flagger Canary Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease and Kustomization APIs
- Flagger canary analysis and webhooks
- Flagger loadtester
- Kubernetes
- Chaos Mesh PodChaos
- Prometheus metrics analysis

## Sources Consulted
- Flagger Webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Flagger Metrics Analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger NGINX Canary Deployments documentation: https://docs.flagger.app/tutorials/nginx-progressive-delivery
- Flagger loadtester package documentation: https://pkg.go.dev/github.com/fluxcd/flagger/pkg/loadtester
- Flagger Helm chart values: https://raw.githubusercontent.com/fluxcd/flagger/main/charts/flagger/values.yaml
- Flagger loadtester chart values: https://raw.githubusercontent.com/fluxcd/flagger/main/charts/loadtester/values.yaml
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Chaos Mesh PodChaos documentation: https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh PodChaos API source: https://raw.githubusercontent.com/chaos-mesh/chaos-mesh/master/api/v1alpha1/podchaos_types.go

## Issues Found
- The custom webhook Deployment example used `curlimages/curl` with `nc` and `kubectl`, but that image is not a valid Kubernetes webhook adapter and does not provide the required tooling or RBAC. Replaced the broken custom service example with the supported Flagger loadtester HelmRelease path and added RBAC rules for managing Chaos Mesh `PodChaos` resources.
- The chaos webhook was described as running before each promotion step while configured as `type: pre-rollout`. Flagger documents `pre-rollout` as running before routing traffic to the canary, while `rollout` hooks run during analysis iterations before metric checks. Changed the chaos webhook to `type: rollout` and updated the explanatory text.
- The PodChaos manifest used a fixed object name with `kubectl apply`, which would not reliably start a fresh one-shot `pod-kill` experiment on every analysis iteration. Added a `kubectl delete ... --ignore-not-found` before applying the manifest.
- The PodChaos `pod-kill` snippet used `duration`, which is required for `pod-failure` but not for one-shot `pod-kill`. Replaced it with `gracePeriod: 0`, which is the documented `pod-kill` field.
- The load-test webhook omitted the hook type, relying on Flagger's default behavior. Added `type: rollout` to make the timing explicit and consistent with the chaos gate.
- The sequence diagram said the Chaos Mesh experiment was complete immediately after the webhook. For this webhook pattern, Flagger receives confirmation that the experiment was accepted. Updated the diagram text accordingly.

## Review Notes
- The Flux `HelmRelease` and `Kustomization` API versions and fields used in the post are current and match the v2/v1 API references.
- The Flagger `Canary` fields, built-in `request-success-rate` metric, `thresholdRange`, `maxWeight`, and `stepWeight` usage match official Flagger examples.
- The HelmRepository resources for the Flagger charts are assumed to exist in the surrounding Flux repository, as they are referenced but not shown in this post.
