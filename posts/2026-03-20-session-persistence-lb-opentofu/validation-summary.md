# Validation Summary: How to Configure Session Persistence with Load Balancers in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / HCL
- AWS Application Load Balancer target groups and sticky sessions
- Amazon ECS on Fargate with ALB target groups
- Azure Application Gateway backend HTTP settings
- Google Cloud backend services and session affinity

## Sources Consulted
- AWS Application Load Balancer target group attributes and sticky sessions: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
- AWS Elastic Load Balancing TargetGroupAttribute API reference: https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_TargetGroupAttribute.html
- AWS ECS Application Load Balancer guidance: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/alb.html
- AWS ECS load balancer connection draining guidance: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/load-balancer-connection-draining.html
- Terraform AWS provider `aws_lb_target_group` documentation/source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb_target_group.html.markdown
- Terraform AWS provider `aws_lb_target_group` implementation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/internal/service/elbv2/target_group.go
- Terraform AWS provider `aws_ecs_service` documentation/source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_service.html.markdown
- Terraform AzureRM provider `azurerm_application_gateway` documentation/source: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/application_gateway.html.markdown
- Microsoft Learn Application Gateway session affinity troubleshooting: https://learn.microsoft.com/en-us/troubleshoot/azure/application-gateway/how-to-troubleshoot-application-gateway-session-affinity-issues
- Terraform Google provider `google_compute_backend_service` documentation/source: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_backend_service.html.markdown
- Google Cloud backend services overview: https://cloud.google.com/load-balancing/docs/backend-service
- Google Cloud external Application Load Balancer request distribution and session affinity: https://cloud.google.com/load-balancing/docs/https/request-distribution
- Google Compute Engine backendServices REST reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/backendServices

## Issues Found
- The GCP cookie example mixed `session_affinity = "CLIENT_IP"` with a `consistent_hash.http_cookie` block. `http_cookie` is applicable to cookie-based affinity, not client IP affinity. I changed the example to use `STRONG_COOKIE_AFFINITY` with `strong_session_affinity_cookie` for an external managed Application Load Balancer.
- The GCP header example used `session_affinity = "HTTP_COOKIE"` while routing by `consistent_hash.http_header_name`. I changed it to `HEADER_FIELD`, added `locality_lb_policy = "RING_HASH"`, and made the backend service self-managed where the provider documents `consistent_hash`.
- The GCP backend snippets used session affinity with the default backend balancing behavior. Google recommends avoiding `UTILIZATION` balancing when session affinity is enabled, so I set `balancing_mode = "RATE"` and added `max_rate_per_instance = 100`.
- The ECS Fargate service referenced `aws_lb_target_group.sticky`, whose default target type is `instance`. Fargate tasks using `awsvpc` networking require `target_type = "ip"`, so I changed the service to reference `aws_lb_target_group.sticky_fargate`.
- The post said deregistration delay must exceed the session cookie duration. AWS documents deregistration delay as the time to drain in-flight requests and keep-alive connections, and ALB routes new requests away from draining targets. I changed the guidance to say deregistration delay should cover expected in-flight requests and keep-alive connections, not the sticky cookie lifetime.
- The summary described ALB `app_cookie` stickiness as simply respecting the existing application cookie. AWS documents that ALB uses the configured application cookie name together with an ALB-generated application cookie, so I clarified that behavior.

## Review Notes
The snippets still assume surrounding infrastructure such as provider configuration, VPCs, listeners, backend pools, probes, health checks, and instance groups already exists. Future improvements could add a complete end-to-end example per cloud provider, but the reviewed snippets now use the correct affinity modes and provider fields for the concepts shown.
