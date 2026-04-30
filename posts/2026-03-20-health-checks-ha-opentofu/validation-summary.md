# Validation Summary: How to Configure Health Checks for High Availability with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS Application Load Balancer
- AWS Route 53
- Amazon CloudWatch
- Google Cloud Load Balancing health checks
- Kubernetes probes

## Sources Consulted
- HashiCorp AWS provider docs for `aws_lb_target_group`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lb_target_group.html.markdown
- HashiCorp AWS provider docs for `aws_route53_health_check`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/route53_health_check.html.markdown
- HashiCorp AWS provider docs for `aws_cloudwatch_metric_alarm`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- AWS docs for Application Load Balancer target group health checks: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS docs for Application Load Balancer CloudWatch metrics: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- AWS docs for Route 53 health check configuration values: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-creating-values.html
- AWS docs for how Route 53 determines health check status: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-determining-health-of-endpoints.html
- HashiCorp Google provider docs for `google_compute_health_check`: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/compute_health_check.html.markdown
- Google Cloud docs for health checks: https://cloud.google.com/load-balancing/docs/health-checks
- Google Cloud docs for health check concepts: https://cloud.google.com/load-balancing/docs/health-check-concepts
- HashiCorp Kubernetes provider example for deployments: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/examples/resources/deployment_v1/example_1.tf
- HashiCorp Kubernetes provider source showing `kubernetes_deployment` deprecation and `kubernetes_deployment_v1`: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/kubernetes/provider.go
- HashiCorp Kubernetes provider source for probe fields: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/kubernetes/structures_container.go
- Kubernetes docs for liveness, readiness, and startup probes: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/

## Issues Found
- The post metadata claimed Azure coverage, but the article only covered AWS, GCP, and Kubernetes. I removed `Azure` from the tags and corrected the description.
- The description and overview said the post covered automatic instance replacement and synthetic monitoring, but the examples actually cover traffic routing, DNS failover, and Kubernetes recovery behavior. I corrected those statements to match the implemented examples.
- The AWS ALB snippet described `unhealthy_threshold` as "Fast deregistration", which is inaccurate. Health checks mark targets unhealthy and stop routing to them; they do not deregister the targets. I changed the comment to "Fast unhealthy detection".
- The Route 53 CloudWatch example used a metric math alarm across multiple metrics to calculate a 5xx rate. AWS Route 53 health checks that monitor CloudWatch alarms do not support that alarm type. I replaced it with a supported single-metric `HTTPCode_Target_5XX_Count` alarm and kept the example aligned with the original intent.
- The GCP HTTP health check example used `request_headers`, which is not a valid field on `google_compute_health_check.http_health_check`. I removed that field and updated the comment to describe expected-response validation instead.
- The Kubernetes example used deprecated `kubernetes_deployment` instead of current `kubernetes_deployment_v1`. I updated the resource type.
- The Kubernetes deployment example was incomplete because it lacked a required selector and matching pod template labels. I added `selector.match_labels` and corresponding template labels so the resource is valid.
- The Kubernetes readiness probe comment said it "remove[s] from load balancer if not ready", which is too specific. Readiness controls whether a Pod receives traffic. I corrected the wording.
- The summary overstated Route 53 and Kubernetes behavior. I updated it so the Route 53 calculated health check description refers to the calculated check's health status, and the readiness probe description refers to pod traffic eligibility rather than generic load balancer routing.

## Review Notes
- `kubernetes_deployment` is still present in the provider as a deprecated alias, but `kubernetes_deployment_v1` is the current non-deprecated resource and is the better choice for a correctness-focused tutorial.
- The corrected Route 53 / CloudWatch example now uses an absolute 5xx count because Route 53 CloudWatch health checks cannot use multi-metric math alarms. If the post later wants percentage-based failover logic, that should be presented as a different pattern.
