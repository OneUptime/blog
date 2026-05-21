# Validation Summary: How to Implement Canary Deployments with Istio and Flagger

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- Istio
- Kubernetes
- Helm
- Prometheus
- PromQL

## Sources Consulted
- Flagger install documentation: https://docs.flagger.app/main/install/flagger-install-on-kubernetes
- Flagger Istio canary tutorial: https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Flagger canary behavior documentation: https://docs.flagger.app/usage/how-it-works
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger FAQ for Kubernetes services, Istio queries, and generated Istio resources: https://docs.flagger.app/faq
- Flagger webhook documentation: https://docs.flagger.app/usage/webhooks
- Flagger monitoring documentation: https://docs.flagger.app/usage/monitoring

## Issues Found
- The Flagger Helm install command omitted the explicit Canary CRD installation and `--set crd.create=false` used by the current official Helm installation flow. Added the CRD apply step and changed the Helm commands to `helm upgrade -i` with `crd.create=false`.
- The generated Istio resource list described a single `DestinationRule` with subsets. Current Flagger Istio examples generate separate primary and canary `DestinationRule` resources, so the list now names `my-app-primary` and `my-app-canary` DestinationRules.
- The custom Prometheus error-rate query selected `destination_workload=~"{{ target }}-canary"`, but Flagger's canary workload remains the target deployment name while `-canary` is the service name. Updated the query to select `destination_workload=~"{{ target }}"`.
- The load-test webhook omitted the command task type and timeouts shown in Flagger webhook examples. Added `metadata.type: cmd` for the load test and explicit timeouts for both example webhooks.
- The monitoring examples used incorrect Flagger metric semantics: `flagger_canary_status` is numeric `0=running, 1=successful, 2=failed`, `flagger_canary_weight` is labeled by `workload`, and `flagger_canary_total` is shown as a namespace-level gauge. Updated the PromQL examples and failed-canary alert expression accordingly.

## Review Notes
The examples assume an existing Istio telemetry and Prometheus setup, and the Prometheus Service DNS name must be adjusted to match the target cluster. The post does not pin Flagger or Istio versions, so the validation was performed against the current Flagger documentation available on 2026-05-21.
