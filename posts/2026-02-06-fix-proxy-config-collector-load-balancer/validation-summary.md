# Validation Summary: How to Fix Proxy Config Issues When the Collector Cannot Reach an OTLP Backend

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP/gRPC and OTLP/HTTP exporters
- HTTP proxy environment variables
- AWS Application Load Balancer gRPC target groups
- Terraform AWS provider
- NGINX gRPC proxying
- Kubernetes `kubectl exec`
- `curl`

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP gRPC exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector HTTP client config README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OpenTelemetry Collector gRPC config README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- OpenTelemetry Collector v0.144.0 release notes for OTLP exporter renames: https://github.com/open-telemetry/opentelemetry-collector/releases/tag/v0.144.0
- AWS Application Load Balancer target group documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- AWS Application Load Balancer attribute documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html
- Terraform AWS provider `aws_lb_target_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- NGINX gRPC module documentation: https://nginx.org/en/docs/http/ngx_http_grpc_module.html
- NGINX HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html

## Issues Found
- The Collector examples used deprecated exporter component names `otlphttp` and `otlp`. Updated them to the current `otlp_http` and `otlp_grpc` names because recent Collector releases keep the old names only as deprecated aliases.
- The gRPC exporter example included `proxy_url`, but the Collector gRPC client configuration does not expose that field. Updated the example to rely on `HTTPS_PROXY` and `NO_PROXY` environment variables, which the Collector documentation says are respected for exporter proxy routing.
- The Terraform ALB target group example used `protocol_version = "gRPC"`. Updated it to `protocol_version = "GRPC"`, matching the Terraform AWS provider enum.
- The NGINX example used `listen 4317 http2;`. Updated it to `listen 4317;` plus `http2 on;`, matching current NGINX HTTP/2 documentation.

## Review Notes
The diagnostic `curl --data-binary ""` request is useful for checking reachability but may return an application-level OTLP error because the body is empty. That does not invalidate the connectivity troubleshooting workflow.
