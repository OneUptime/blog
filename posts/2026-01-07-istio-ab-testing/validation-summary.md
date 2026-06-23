# Validation Summary: How to Set Up A/B Testing with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio traffic management
- Kubernetes
- Istio VirtualService, DestinationRule, Gateway, and Telemetry APIs
- Prometheus and PromQL
- Prometheus Operator PrometheusRule resources
- Grafana dashboards
- Python statistical analysis with requests, NumPy, and SciPy

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio custom metrics with Telemetry API: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio metric classification / AttributeGen guidance: https://istio.io/latest/docs/tasks/observability/metrics/classify-metrics/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio supported releases and Kubernetes version support: https://istio.io/latest/docs/releases/supported-releases/
- Prometheus query examples: https://prometheus.io/docs/prometheus/latest/querying/examples/

## Issues Found
- The prerequisites listed Kubernetes 1.24+ and Istio 1.18+ as recommended, but those versions are outside current Istio support guidance. Updated the prerequisites to require a Kubernetes version supported by the selected Istio release and a currently supported Istio release.
- Istio networking examples used `networking.istio.io/v1beta1`. Updated VirtualService, DestinationRule, and Gateway snippets to the current `networking.istio.io/v1` API version.
- The sample application used placeholder image names without noting that users must provide those images. Added a note that the images must be built/pushed or replaced with cluster-accessible images.
- The header-routing test commands used in-cluster service DNS directly from the local shell. Added deployment of Istio's official sleep client and changed the test commands to run from inside the mesh.
- The cookie-routing example claimed that Istio would randomly assign users and set a cookie. VirtualService can split traffic but does not set the cookie by itself. Updated the comment to state that the application or edge layer must set the cookie.
- The A/B/n example routed to subset `v3` without warning that matching `version: v3` pods must exist. Added that requirement.
- The Telemetry example used `telemetry.istio.io/v1alpha1` and `UPSERT` tag overrides without required `value` fields. Updated it to `telemetry.istio.io/v1` and used valid `disabled: false` metric overrides while noting that `destination_version` and `source_version` are standard labels.
- The custom metrics section used an EnvoyFilter Lua example that set dynamic metadata but did not actually expose custom Istio metric labels. Replaced it with a Telemetry API tag override example for bounded request-header dimensions.
- The post created multiple Telemetry resources selecting the same workload, which can conflict. Updated the custom metrics example to extend the same Telemetry resource name.
- Several PromQL examples subtracted or divided vectors with different `destination_version` label values, which would produce no result. Wrapped single-series operands in `scalar(...)` to make the comparisons work.
- The statistical significance script claimed to use a t-test for latency but did not implement one. Updated the description and removed an unused `json` import.
- The PrometheusRule examples assumed Prometheus Operator CRDs without saying so. Added notes that those snippets apply when using Prometheus Operator.
- The traffic split drift alert annotation described `$value` as the actual v2 traffic share, but the expression returns drift from the target. Updated the annotation text.
- Troubleshooting commands used `jq`, so the prerequisite list now includes local `jq`.

## Review Notes
The Kubernetes `product-service` application remains illustrative; users still need a real application image that exposes `/health` and `/api/products`. The statistical script is suitable as an example, but production A/B testing should also account for experiment design, sample size, multiple comparisons, and business conversion metrics outside Istio's request telemetry.
