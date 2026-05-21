# Validation Summary: How to Customize Istio Helm Values

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio
- Helm
- Kubernetes
- Envoy sidecar proxy configuration
- Istio ingress gateway configuration
- Istio MeshConfig

## Sources Consulted
- Istio official Helm installation documentation: https://istio.io/latest/docs/ambient/install/helm/
- Istio official tracing MeshConfig documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/mesh-and-proxy-config/
- Istio official MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio 1.24 istiod Helm chart values: https://raw.githubusercontent.com/istio/istio/release-1.24/manifests/charts/istio-control/istio-discovery/values.yaml
- Istio 1.24 gateway Helm chart values: https://raw.githubusercontent.com/istio/istio/release-1.24/manifests/charts/gateway/values.yaml
- Helm official `helm show values` documentation: https://docs.helm.sh/docs/helm/helm_show_values/
- Helm official `helm upgrade` documentation: https://helm.sh/docs/v3/helm/helm_upgrade/

## Issues Found
- The istiod Helm examples used `pilot:` as a top-level wrapper for resource, autoscaling, environment, and replica settings. The `istio/istiod` Helm chart expects these values at the chart root, so I moved `resources`, `replicaCount`, `autoscaleEnabled`, `autoscaleMin`, `autoscaleMax`, `autoscaleBehavior`, `cpu`, and `env` to the root of the relevant values snippets.
- The `--set pilot.replicaCount=3` command used the wrong Helm value path for the `istio/istiod` chart. I changed it to `--set replicaCount=3`.
- The sidecar proxy example described `concurrency: 0` as auto-detection. Istio's ProxyConfig treats unset concurrency as auto-detected; setting `0` uses all cores and ignores CPU requests or limits. I changed the example to use a positive value and updated the comment.
- The sidecar proxy example included `global.proxy_init.resources`, which is not a supported Istio 1.24 istiod Helm value for injected init-container resources. I removed that unsupported block.
- The gateway service ports example overrode `service.ports` without preserving the default `status-port` entry. I added the `15021` status port so load balancer health checks and the chart's default service shape remain intact.
- The sidecar injection example used `sidecarInjectorWebhook.defaultInjectionPolicy`, which is not the Istio 1.24 istiod Helm value. I changed it to `global.proxy.autoInject`.
- The security example used `tag: "1.24.0-distroless"`. Istio's Helm values model separates the image tag from the image variant, so I changed it to `tag: "1.24.0"` and `variant: distroless`.
- The security example said `enableAutoMtls` enabled strict mTLS. Auto mTLS is not the same as strict mTLS enforcement, so I corrected the comment to "Enable auto mTLS."
- The security example labeled `meshConfig.certificates: []` as certificate TTL. That field is deprecated certificate provisioning configuration and not TTL configuration. I changed the example to `caCertificates: []` with an accurate comment about additional root certificates.
- The monitoring example described `global.proxy.enableCoreDump: false` as enabling Prometheus metrics. That setting is unrelated to Prometheus metrics, so I removed it and kept the supported `enablePrometheusMerge` setting.

## Review Notes
Helm was not installed in the local environment, so I could not render the chart with `helm template`. I verified the corrected value paths against the official Istio 1.24 chart values and templates from the upstream Istio repository instead. The tracing example remains technically valid, but Istio's current documentation encourages using the Telemetry API for tracing configuration in newer deployments.
