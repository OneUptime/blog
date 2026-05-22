# Validation Summary: How to Configure Automatic Canary Analysis with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Flagger
- Prometheus
- PromQL
- kubectl

## Sources Consulted
- Istio standard metrics documentation: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API documentation: https://istio.io/latest/docs/reference/config/telemetry/
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger FAQ on success rate and request duration queries: https://docs.flagger.app/faq
- Flagger deployment strategy documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger webhook/load testing documentation: https://docs.flagger.app/main/usage/webhooks

## Issues Found
- The initial success-rate example used a raw `istio_requests_total` selector for 2xx/3xx responses, which does not calculate a rate or percentage. Changed it to a PromQL ratio over `rate(istio_requests_total[5m])` multiplied by 100, consistent with Flagger's documented success-rate approach.
- The initial error-rate example used a raw `istio_requests_total` selector. Changed it to `sum(rate(...[5m]))` so the example represents a rate over time.
- Custom Flagger `MetricTemplate` examples selected the canary workload as `{{ target }}-canary`. Flagger documents `{{ target }}` as `canary.spec.targetRef.name`, and its Istio metric examples query the canary workload with `destination_workload=~"{{ target }}"`. Updated the latency, business metric, and canary-vs-primary examples to use `{{ target }}` for the canary workload while keeping `{{ target }}-primary` for the primary workload.
- The analysis timing section said up to 5 failed checks were allowed before rollback and gave a rough total maximum of 10 minutes. Flagger documents `threshold` as the maximum number of failed metric checks before rollback and gives rollback timing as `interval * threshold`. Updated the wording to say rollback occurs after 5 failed checks and takes 5 minutes if checks keep failing.

## Review Notes
The examples assume the default Flagger/Istio workload naming model, where the canary workload is the target deployment name and Flagger creates the primary workload with the `-primary` suffix. The `api-server-canary` URL in the load-test webhook remains correct because that suffix is used for the generated canary service.
