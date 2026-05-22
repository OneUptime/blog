# Validation Summary: How to Build Progressive Delivery Pipeline with Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio traffic management
- Kubernetes Deployments and Services
- Flagger progressive delivery
- Helm
- Prometheus metrics
- Grafana monitoring

## Sources Consulted
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Flagger install on Kubernetes: https://docs.flagger.app/install/flagger-install-on-kubernetes
- Flagger how it works: https://docs.flagger.app/usage/how-it-works
- Flagger deployment strategies: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger metrics analysis: https://docs.flagger.app/main/usage/metrics
- Flagger monitoring: https://docs.flagger.app/main/usage/monitoring
- Kubernetes Services and label selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The manual Istio canary example created Deployments and Istio routing resources but no Kubernetes Service named `my-app`. Istio's `host: my-app` must correspond to a service in the registry for the route to resolve. Added a `Service` that selects `app: my-app` and exposes port 8080 for both stable and canary pods.
- The Flagger Helm installation omitted the current documented CRD installation step and `crd.create=false` Helm value. Updated the commands to apply the Canary CRD first and install/upgrade Flagger with `helm upgrade -i`.
- The blue-green strategy table described databases as a best fit. That is too broad because database releases usually require separate schema/data migration safety, not just traffic switching. Changed the table to describe blue-green as best for services that need all-at-once cutover.
- The traffic mirroring section said mirroring had no risk to production users. Flagger and Istio discard mirrored responses, but the mirrored workload still processes the copied requests, which can matter for non-idempotent writes or side effects. Updated the wording to call out idempotent or side-effect-safe requests.

## Review Notes
The remaining Istio `networking.istio.io/v1` resources, weighted routing, header-based routing, `mirrorPercentage`, Flagger `Canary` fields, built-in metric names, custom `MetricTemplate`, and Flagger monitoring metric names are consistent with current official documentation. The Flagger examples assume Prometheus is reachable at the configured in-cluster DNS name.
