# Validation Summary: How to Configure Flagger with Gateway API HTTPRoute

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes Gateway API
- Gateway API HTTPRoute
- Flagger
- Helm
- Prometheus
- kubectl

## Sources Consulted
- Flagger Gateway API Canary Deployments: https://docs.flagger.app/tutorials/gatewayapi-progressive-delivery
- Flagger Canary CRD schema: https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml
- Flagger Metrics Analysis: https://docs.flagger.app/main/usage/metrics
- Kubernetes Gateway API versioning: https://gateway-api.sigs.k8s.io/concepts/versioning/
- Kubernetes Gateway API HTTP traffic splitting: https://gateway-api.sigs.k8s.io/guides/traffic-splitting/
- Kubernetes Gateway API releases: https://github.com/kubernetes-sigs/gateway-api/releases

## Issues Found
- The Flagger Gateway API provider value was shown as `gatewayapi`, but the current Flagger Canary CRD enum uses `gatewayapi:v1` or `gatewayapi:v1beta1`. Updated the Helm `meshProvider` value and Canary `spec.provider` to `gatewayapi:v1`.
- The tutorial applied a Gateway in the `test` namespace before creating that namespace. Added an idempotent namespace creation command before applying the Gateway.
- The post instructed users to create an application `HTTPRoute` manually, but Flagger's Gateway API integration generates and manages the HTTPRoute from the Canary `service.hosts` and `service.gatewayRefs` fields. Reworded the section and removed the `kubectl apply -f httproute.yaml` step.
- The sample application created a `Service` named `podinfo`, which conflicts with Flagger's responsibility to generate the apex, primary, and canary ClusterIP services. Removed the manually defined Service and clarified that Flagger creates the traffic-shifting services.
- The Canary resource did not include `service.hosts`, so the generated HTTPRoute would not include the intended `app.example.com` hostname. Added `hosts`.
- The post referenced the Flagger load tester webhook service but never installed it. Added the official Flagger load tester kustomize apply command.
- The generated HTTPRoute examples used service port `80` after the Canary service was corrected to use port `9898`. Updated examples and the load-test command to use `9898`.

## Review Notes
- The Gateway API CRD install command uses the older v1.0.0 Standard Channel bundle. It is still a valid Gateway API `v1` example, but users should choose a Gateway API bundle supported by their cluster and controller.
- The built-in `request-success-rate` and `request-duration` metrics are valid Flagger metrics, but Gateway API implementations expose different Prometheus metric labels. Production setups may need provider-specific MetricTemplates, as shown in the official Flagger Gateway API tutorial.
