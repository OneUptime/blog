# Validation Summary: How to Fix Trace Context Being Lost When Requests Pass Through a Reverse Proxy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- W3C Trace Context
- OpenTelemetry propagation
- NGINX reverse proxy configuration
- HAProxy reverse proxy configuration
- AWS Application Load Balancer
- Amazon API Gateway
- Amazon CloudFront
- Kubernetes Ingress
- ingress-nginx OpenTelemetry annotations
- Traefik Headers middleware
- Terraform AWS provider resources

## Sources Consulted
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- NGINX `ngx_http_proxy_module` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX `ngx_otel_module` documentation: https://nginx.org/en/docs/ngx_otel_module.html
- HAProxy HTTP rewrites documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/http-rewrites/
- Amazon API Gateway REST API parameter mapping examples: https://docs.aws.amazon.com/apigateway/latest/developerguide/request-response-data-mappings.html
- Terraform `aws_api_gateway_integration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_integration
- AWS Application Load Balancer header modification documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/header-modification.html
- Amazon CloudFront origin request policy documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html
- Terraform `aws_cloudfront_origin_request_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_request_policy
- ingress-nginx OpenTelemetry documentation: https://kubernetes.github.io/ingress-nginx/user-guide/third-party-addons/opentelemetry/
- Traefik Headers middleware documentation: https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/headers/

## Issues Found
- The NGINX section incorrectly said that setting any `proxy_set_header` makes NGINX pass only explicitly listed headers plus a few defaults. NGINX request headers are forwarded by default when `proxy_pass_request_headers` is enabled; `proxy_set_header Host $host;` does not remove unrelated request headers. Updated the explanation to point readers toward actual stripping causes such as `proxy_pass_request_headers off;` or empty `proxy_set_header` values.
- The HAProxy section said HAProxy needs explicit configuration to forward trace headers and used older `reqidel`/`reqdel` examples. HAProxy forwards request headers by default, and current configuration should use `http-request del-header` when deleting headers. Updated the wording and examples accordingly.
- The HAProxy tracing note suggested `option dontlognull` could affect header forwarding. That option is logging-related, not trace-header forwarding. Replaced the note with a correct caveat that `option forwardfor` only manages `X-Forwarded-For`.
- The API Gateway example mapped response headers through `aws_api_gateway_method_response` and `aws_api_gateway_integration_response`, which does not fix lost incoming trace context. Replaced it with REST API non-proxy request header mappings using `method.request.header.*` and `integration.request.header.*`.
- The AWS ALB wording was too absolute. Updated it to note that valid request headers are passed unless configured header modification or invalid-header dropping behavior affects them.
- The AWS examples were marked as YAML even though the snippets are Terraform HCL. Updated the code fence language to `hcl`.
- The Traefik example said `traceparent: ""` means pass through from the client. Traefik documents empty custom header values as removal. Updated the example to warn against removing trace headers and changed the CRD API group to the current `traefik.io/v1alpha1`.
- The NGINX OpenTelemetry snippet used incorrect directive and module names. Updated it to the current `ngx_otel_module` directives: `load_module modules/ngx_otel_module.so;`, `otel_exporter`, `otel_trace on;`, and `otel_trace_context propagate;`.

## Review Notes
The post is now technically valid as a practical troubleshooting guide. Future improvements could add version-specific notes for managed gateways and ingress controllers, because header behavior can change when users enable provider-specific tracing, caching, security, or header-rewrite features.
