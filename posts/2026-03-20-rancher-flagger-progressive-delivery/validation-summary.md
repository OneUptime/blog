# Validation Summary: How to Configure Progressive Delivery with Flagger on Rancher (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Flagger
- Kubernetes
- Helm
- NGINX Ingress Controller
- Prometheus
- Prometheus Operator ServiceMonitor
- Slack

## Sources Consulted
- Flagger install guide: https://docs.flagger.app/install/flagger-install-on-kubernetes
- Flagger NGINX progressive delivery tutorial: https://docs.flagger.app/main/tutorials/nginx-progressive-delivery
- Flagger deployment strategies: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger metrics analysis: https://docs.flagger.app/main/usage/metrics
- Flagger webhooks: https://docs.flagger.app/main/usage/webhooks
- Flagger alerting: https://docs.flagger.app/main/usage/alerting
- Flagger Canary CRD: https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml
- Rancher ServiceMonitor and PodMonitor configuration: https://ranchermanager.docs.rancher.com/reference-guides/monitoring-v2-configuration/servicemonitors-and-podmonitors
- Flagger upstream source and examples: https://github.com/fluxcd/flagger

## Issues Found
- The `helm install flagger-loadtester` command omitted namespace creation. I added `--create-namespace` so the install works when `test` does not already exist.
- The Prometheus section implied the built-in Flagger NGINX checks come from application metrics. I corrected the text to distinguish NGINX ingress metrics from the separate application `ServiceMonitor`, which is only needed for the custom metric example.
- The canary load-test webhook targeted the `webapp-canary` service directly, which bypasses NGINX ingress traffic shifting and does not match Flagger's documented NGINX pattern. I changed it to target the ingress host instead.
- The smoke-test webhook called the canary service without the configured service port. I updated the URL to use port `8080`.
- The sample rollout output did not match Flagger's documented `kubectl` output patterns. I replaced it with a realistic `kubectl describe canary` event sequence based on upstream examples and current phase names.
- The A/B testing example used a regex cookie match that is not supported by Flagger's documented NGINX behavior. I changed it to an exact cookie-name match and added the missing ingress/service context.
- The A/B testing example used a separate Canary name while still targeting the same deployment, which would be misleading because Flagger derives managed service names from `targetRef.name`. I changed it to reuse the same canary resource name as an alternative configuration.
- The blue-green example incorrectly mixed `iterations` with `stepWeight` and `maxWeight`. I removed the traffic-weight settings, added the missing ingress/service context, and reused the same canary resource name to reflect Flagger's documented blue-green configuration model.

## Review Notes
- The custom `MetricTemplate` is valid Flagger syntax, but it assumes your application exports `http_requests_total` with `namespace`, `pod`, and `status` labels. Real-world applications often use different metric and label names, so the PromQL may need to be adapted.
- The built-in `request-success-rate` and `request-duration` checks depend on Rancher Monitoring scraping NGINX ingress controller metrics. If those metrics are not enabled in the ingress controller deployment, Flagger's built-in checks will not produce usable values.
