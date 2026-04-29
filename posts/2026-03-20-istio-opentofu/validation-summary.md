# Validation Summary: How to Deploy Istio with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu / Terraform-style HCL
- Kubernetes
- Istio
- Helm
- Kiali
- Jaeger
- mTLS

## Sources Consulted
- Istio 1.20 Helm installation guide: https://istio.io/v1.20/docs/setup/install/helm/
- Istio 1.20 PeerAuthentication reference: https://istio.io/v1.20/docs/reference/config/security/peer_authentication/
- Istio 1.20 sidecar injection guide: https://istio.io/v1.20/docs/setup/additional-setup/sidecar-injection/
- Istio 1.20 MeshConfig reference: https://istio.io/v1.20/docs/reference/config/istio.mesh.v1alpha1/
- Istio 1.20 chart sources and values: https://github.com/istio/istio/tree/release-1.20/manifests/charts
- Kiali CR reference: https://kiali.io/docs/configuration/kialis.kiali.io/
- Kiali Jaeger configuration guide: https://kiali.io/docs/configuration/p8s-jaeger-grafana/tracing/jaeger/
- Kiali distributed tracing FAQ: https://kiali.io/docs/faq/distributed-tracing/
- Kiali anonymous authentication docs: https://kiali.io/docs/configuration/authentication/anonymous/
- Jaeger getting started docs: https://www.jaegertracing.io/docs/1.45/getting-started/
- Terraform Registry `helm_release`: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform Registry `kubernetes_manifest`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- Terraform Registry `kubernetes_namespace`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/namespace

## Issues Found
- The architecture diagram labeled the Istio ingress gateway as handling east-west traffic and showed Jaeger pointing to a workload. I corrected this to north-south traffic and reversed the trace flow so the workload points to Jaeger.
- The Istio tracing snippet enabled tracing and sampling but did not point Envoy to the Jaeger-backed collector shown later in the post. I added `defaultConfig.tracing.zipkin.address = "jaeger-collector.observability:9411"` so traces are sent to a Jaeger collector-compatible endpoint.
- The gateway chart snippet set only `replicaCount`, but the Istio gateway chart enables autoscaling by default. I replaced that with `autoscaling.minReplicas` and `autoscaling.maxReplicas` so the example matches the gateway chart's actual behavior.
- The Kiali snippet used `external_services.tracing.url`, which Kiali documents as deprecated after v1.73, and it omitted the Jaeger path/transport details. I changed it to `external_services.tracing.internal_url = "http://jaeger-query.observability:16686/jaeger"` and added `external_services.tracing.use_grpc = false` to match the HTTP query port.
- The best-practices text said strict mTLS cluster-wide encrypts all service-to-service traffic automatically. I tightened that wording to mesh-wide/root-namespace scope and "meshed service-to-service communication" so it matches Istio's actual policy scope.

## Review Notes
- The post pins Istio `1.20.2` and Kiali `1.77.0`. Those versions are older than current releases as of `2026-04-29`, but the corrected examples are technically consistent for the pinned versions.
- Newer Istio documentation increasingly uses extension providers plus the Telemetry API for distributed tracing. This post now remains accurate for its pinned Helm-based example, but it is not following the newest tracing pattern.
- Kiali's richer graph and tracing views still depend on external backends such as Prometheus and Jaeger being installed and reachable. The post configures Kiali to use those services but does not install them.
