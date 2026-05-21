# Validation Summary: How to Integrate Istio with Flagger for Progressive Delivery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Flagger
- Kubernetes
- Helm
- Prometheus
- Istio VirtualService and DestinationRule resources

## Sources Consulted
- Flagger install documentation: https://docs.flagger.app/install/flagger-install-on-kubernetes
- Flagger Istio canary deployment tutorial: https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger deployment strategies documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger alerting documentation: https://docs.flagger.app/main/usage/alerting
- Flagger FAQ for Istio routing and generated services: https://docs.flagger.app/faq
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/

## Issues Found
- The Flagger Helm install example omitted the current documented step for installing the Canary CRD separately and setting `crd.create=false` on the Helm release. I added the CRD apply command and changed the Helm command to `helm upgrade -i` with `--set crd.create=false`.
- The post said Prometheus should already be available with Istio's default profile. Current Istio documentation treats Prometheus as an add-on or external/custom Prometheus installation, so I replaced that claim with the official sample add-on command and clarified that production setups should use Prometheus configured to scrape Istio metrics.
- The post said Flagger creates a `my-app-canary` Deployment. Flagger creates a primary Deployment and uses the original target Deployment as the canary workload, along with generated services and Istio routing resources. I corrected the generated resource list to mention the `my-app-canary` Service instead.
- The post described a single Istio DestinationRule with subsets for primary and canary. Flagger's Istio examples generate DestinationRule resources for the primary and canary services, so I corrected that wording.

## Review Notes
The remaining manifests and examples use current Flagger `flagger.app/v1beta1` resources, valid built-in metric names, valid `thresholdRange` usage, supported A/B header matching, Prometheus `MetricTemplate` syntax, and supported `AlertProvider`/`alerts` fields. The sample Prometheus add-on is suitable for demonstrations; production clusters should use a production-grade Prometheus configuration.
