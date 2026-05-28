# Validation Summary: Fix Google Cloud Load Balancer Returning 502 Bad Gateway Server Connection Error

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Application Load Balancers
- Google Cloud backend services and health checks
- Cloud Logging load balancer logs
- Cloud Monitoring metrics and alerting policies
- gcloud CLI
- Nginx
- Apache HTTP Server
- Node.js HTTP server
- Go net/http server

## Sources Consulted
- Google Cloud: Troubleshoot issues with external Application Load Balancers - https://cloud.google.com/load-balancing/docs/https/troubleshooting-ext-https-lbs
- Google Cloud: Backend services overview - https://cloud.google.com/load-balancing/docs/backend-service
- Google Cloud: Health checks overview - https://cloud.google.com/load-balancing/docs/health-check-concepts
- Google Cloud: Global external Application Load Balancer logging and monitoring - https://cloud.google.com/load-balancing/docs/https/https-logging-monitoring
- Google Cloud: Load balancing metrics - https://cloud.google.com/load-balancing/docs/metrics
- Google Cloud SDK: gcloud compute backend-services get-health - https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/get-health
- Google Cloud SDK: gcloud compute backend-services update - https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud SDK: gcloud alpha monitoring policies create - https://cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- Cloud Monitoring: Monitoring filters - https://cloud.google.com/monitoring/api/v3/filters
- NGINX: ngx_http_core_module keepalive_timeout - https://nginx.org/en/docs/http/ngx_http_core_module.html#keepalive_timeout
- Apache HTTP Server 2.4: KeepAliveTimeout directive - https://httpd.apache.org/docs/2.4/mod/core.html#keepalivetimeout
- Node.js HTTP API - https://nodejs.org/api/http.html
- Go net/http package - https://pkg.go.dev/net/http

## Issues Found
- The post implied that all Google Cloud Load Balancers generate 502 for the listed backend failures. Google documentation distinguishes classic Application Load Balancer behavior from newer global and regional external Application Load Balancers, which can generate more specific 5XX codes such as 503 or 504. Updated the wording to scope the article to Application Load Balancers and mention related 5XX behavior.
- The post said all unhealthy backends will return 502. Updated this to say a load balancer-generated 5XX error, which is accurate across Application Load Balancer variants.
- The Cloud Monitoring CPU command used BSD/macOS `date -v-1H`, which does not work in typical Linux or Cloud Shell environments. Replaced it with GNU-style `date -d '1 hour ago'`.
- The Monitoring alert example described a 502 error rate alert but used the wrong monitored resource type for the metric and omitted the required threshold condition. Changed it to a 502 response count alert using `resource.type="https_lb_rule"`, the documented `loadbalancing.googleapis.com/https/request_count` metric, and `--if='> 10'`.

## Review Notes
The troubleshooting flow, statusDetails values, backend keep-alive recommendation of slightly more than 600 seconds, backend service timeout guidance, health check source ranges, and backend service update/get-health commands match current Google Cloud documentation. The monitoring alert remains a simple count-based example; a true percentage-based error-rate alert would require a ratio condition or a more detailed policy definition.
