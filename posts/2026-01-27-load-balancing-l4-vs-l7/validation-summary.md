# Validation Summary: How to Implement Layer 4 vs Layer 7 Load Balancing

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Layer 4 and Layer 7 load balancing
- OSI networking model
- HAProxy TCP and HTTP mode
- Nginx stream and HTTP proxy load balancing
- AWS Network Load Balancer and Application Load Balancer
- Terraform AWS provider resources for load balancers
- Health checks, TLS termination, WebSocket, gRPC, and WAF routing considerations

## Sources Consulted
- HAProxy Configuration Manual: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- HAProxy 2.4 Configuration Manual: https://docs.haproxy.org/2.4/configuration.html
- Nginx stream core module documentation: https://nginx.org/en/docs/stream/ngx_stream_core_module.html
- Nginx stream proxy module documentation: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html
- Nginx stream upstream module documentation: https://nginx.org/en/docs/stream/ngx_stream_upstream_module.html
- Nginx HTTP upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx HTTP proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- AWS Elastic Load Balancing overview: https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
- AWS Network Load Balancer listeners: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-listeners.html
- AWS Network Load Balancer health checks: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/target-group-health-checks.html
- AWS Application Load Balancer target groups: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- AWS Application Load Balancer health checks: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS Application Load Balancer listeners: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html
- Terraform AWS provider `aws_lb_target_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform AWS provider `aws_lb_listener`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener

## Issues Found
- The L4 characteristics stated "No SSL termination," but AWS NLB and other L4-style load balancers can support TLS termination. Updated the wording to clarify that TLS is often passed through unless explicitly configured for TLS termination.
- The decision table recommended L7 for any SSL termination. Updated it to recommend L7 when SSL termination is paired with HTTP inspection, since TLS offload alone can be handled by NLB/TLS listeners.
- The Nginx stream example described `max_fails` and `fail_timeout` as health checks. In Nginx Open Source these are passive failure-handling parameters; active periodic health checks are Nginx Plus functionality. Updated the comment.
- The Nginx HTTP example used `proxy_cache_valid` without defining or enabling a cache zone. Added `proxy_cache_path` and `proxy_cache static_cache` so the cache example actually caches responses.
- The Nginx HTTP example used `listen 443 ssl http2;`, which is superseded by the `http2 on;` directive in current Nginx documentation. Updated the snippet to the current form.
- The Nginx HTTP upstream example described `max_fails` and `fail_timeout` as health parameters. Updated the comment to identify them as passive failure parameters.
- The HAProxy admin routing comment implied non-internal `/admin/` traffic was blocked, but the config only avoided routing it to `admin_servers`. Added an explicit deny rule for non-internal admin requests.
- The HAProxy HTTP health check examples used the old header-on-`option httpchk` form. Updated them to `option httpchk` plus `http-check send ... hdr Host localhost`, which is the current documented form.
- The AWS ALB health-check comparison claimed body matching. ALB health checks match HTTP/gRPC success codes, not response bodies. Updated the table to say status-code matching.
- The AWS NLB protocol list omitted current listener protocol options such as `TCP_UDP`, `QUIC`, and `TCP_QUIC`. Updated the table with the current documented protocol list.
- The Terraform ALB listener rule referenced an undefined `aws_lb_target_group.api_tg` and an undeclared listener resource. Added an `aws_lb_listener` resource and changed the rule to reference the defined `http_tg`.

## Review Notes
Local `haproxy`, `nginx`, and `terraform` binaries were not installed in the review environment, so syntax was verified against official documentation rather than local validators. The performance numbers remain rule-of-thumb estimates; exact latency, throughput, and memory usage depend heavily on implementation, hardware, TLS settings, buffering, and traffic shape.
