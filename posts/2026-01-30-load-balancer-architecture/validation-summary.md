# Validation Summary: How to Build Load Balancer Architecture

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Load balancing architecture
- Layer 4 and Layer 7 load balancing
- NGINX and NGINX Plus
- HAProxy
- AWS Application Load Balancer with Terraform
- Google Cloud external Application Load Balancer with Terraform
- Kubernetes Ingress, Service, and HorizontalPodAutoscaler
- Keepalived and VRRP
- Prometheus and Alertmanager
- Node.js Express health endpoints

## Sources Consulted
- NGINX HTTP health checks: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-health-check/
- NGINX TCP health checks: https://docs.nginx.com/nginx/admin-guide/load-balancer/tcp-health-check/
- NGINX HTTP upstream module: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX stream upstream health check module: https://nginx.org/en/docs/stream/ngx_stream_upstream_hc_module.html
- NGINX HTTP/2 module: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- HAProxy configuration manual: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- HAProxy Prometheus metrics documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/alerts-and-monitoring/prometheus/
- AWS ALB listeners: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html
- AWS ALB listener rules: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-rules.html
- AWS ALB target group health checks: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- Terraform AWS provider `aws_lb_target_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform Google provider `google_compute_backend_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_backend_service
- Google Cloud external Application Load Balancer overview: https://docs.cloud.google.com/load-balancing/docs/https
- Google Cloud health checks: https://docs.cloud.google.com/load-balancing/docs/health-check-concepts
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Keepalived configuration manual: https://www.keepalived.org/manpage.html

## Issues Found
- The Layer 4 comparison stated that L4 load balancers have no SSL termination. Some TCP/TLS load balancers can terminate TLS, while pure TCP pass-through does not. Updated the text and comparison table to make this implementation-dependent.
- The NGINX TCP health check example used HTTP-context `upstream`, `server`, `location`, and `proxy_pass http://...` syntax. Replaced it with a `stream`-context NGINX Plus TCP active health check.
- The NGINX HTTP health check matched `Content-Type` exactly as `application/json`, which can fail against common framework responses that include charset parameters. Changed the matcher to a regex for `application/json`.
- The NGINX HTTPS listener used `listen 443 ssl http2`, which is outdated for current NGINX versions. Updated it to `listen 443 ssl` plus `http2 on`.
- The HAProxy stats listener was scraped at `/metrics` by Prometheus but did not enable HAProxy's Prometheus exporter service. Added `mode http` and `http-request use-service prometheus-exporter if { path /metrics }`.
- The HAProxy HTTP health check examples used older inline `option httpchk` request syntax. Updated them to current `option httpchk` plus `http-check send` syntax.
- The Keepalived section was titled active-active even though the provided VRRP configuration is active-passive master/backup failover. Renamed it to active-passive.
- The HAProxy Prometheus alert rules referenced non-native or incorrect metrics and labels: `haproxy_backend_up`, histogram buckets for response time, `code=~"5.."`, and `$labels.backend`. Updated them to native HAProxy exporter metrics and labels: `haproxy_backend_status{state="UP"}`, `haproxy_backend_response_time_average_seconds`, `code="5xx"`, and `$labels.proxy`.
- The Kubernetes Ingress example used the older ingress class annotation and included an unsupported community ingress-nginx health check annotation. Replaced the ingress class annotation with `spec.ingressClassName` and removed the unsupported health check annotation.

## Review Notes
The configuration snippets are illustrative and still require environment-specific resources such as certificates, DNS, security groups, backend services, Terraform variables, and Kubernetes controller installation. Local syntax validation with `nginx`, `haproxy`, `terraform`, and `kubectl` could not be run because those binaries are not installed in the review environment.
