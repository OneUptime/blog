# Validation Summary: How to Set Up Load Balancing Across Multiple Collector Instances

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector load balancing exporter
- OpenTelemetry Go SDK and OTLP gRPC exporter
- Kubernetes Services, Deployments, probes, and LoadBalancer Services
- NGINX
- HAProxy
- AWS Application Load Balancer and Network Load Balancer
- Terraform AWS provider
- Istio DestinationRule
- DNS-based load balancing
- Prometheus / PromQL

## Sources Consulted
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector load balancing exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/loadbalancingexporter
- OpenTelemetry Go OTLP trace gRPC exporter package docs: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- gRPC custom load balancing policies: https://grpc.io/docs/guides/custom-load-balancing/
- NGINX gRPC module documentation: https://nginx.org/en/docs/http/ngx_http_grpc_module.html
- NGINX upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes liveness/readiness probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/
- Terraform AWS provider `aws_lb_target_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- AWS Network Load Balancer target group health checks: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-health-checks.html
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- HAProxy configuration manual: https://docs.haproxy.org/3.2/configuration.html
- Prometheus operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The NGINX gRPC example placed `grpc_pass` and related `grpc_*` directives directly in the `server` block. NGINX documents `grpc_pass` as valid in `location` or `if in location`, so the example was updated to wrap the gRPC proxy configuration in `location /`.
- The NGINX section claimed active health checking with automatic removal of failed instances. The shown open-source NGINX configuration uses passive failure handling through upstream failure settings, so the wording was corrected.
- The Terraform snippets were marked as YAML even though they are HCL. The code fences were changed to `hcl`.
- The OpenTelemetry Collector load balancing exporter was configured as `loadbalancing`, which is now a deprecated alias. The example was updated to the current `load_balancing` exporter name and matching pipeline reference.
- The DNS-based load balancing section claimed most gRPC clients automatically distribute connections across all resolved addresses. gRPC uses `pick_first` by default, so the text now explains that `round_robin` or another client-side policy is needed for one process to distribute across resolved addresses.
- The Istio `DestinationRule` example used `consecutiveErrors`, which is not the current field name in the Istio API reference. It was changed to `consecutive5xxErrors`.
- The Go SDK example imported unused packages and did not actually configure DNS round-robin against a DNS target. It was updated to create a gRPC client connection with the DNS target, `round_robin` service config, insecure transport credentials, and `otlptracegrpc.WithGRPCConn`.

## Review Notes
The Kubernetes probe examples assume the Collector configuration mounted from `otel-collector-config` enables the `health_check` extension on port 13133. The examples are plausible, but a complete deployment would need that ConfigMap content included elsewhere.
