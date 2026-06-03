# Validation Summary: How to Build Terraform Modules for Kubernetes Ingress

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Kubernetes Ingress
- HashiCorp Kubernetes Terraform provider
- AWS Route 53
- Google Cloud DNS
- cert-manager
- ingress-nginx annotations

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- HashiCorp Kubernetes provider `kubernetes_ingress_v1` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/ingress_v1
- HashiCorp Kubernetes provider `kubernetes_ingress_v1` data source documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/data-sources/ingress_v1
- HashiCorp AWS provider `aws_route53_record` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- HashiCorp Google provider `google_dns_record_set` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_record_set
- cert-manager annotated Ingress documentation: https://cert-manager.io/docs/usage/ingress/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx rewrite documentation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- ingress-nginx retirement notice: https://kubernetes.github.io/ingress-nginx/

## Issues Found
- The post used the legacy `kubernetes.io/ingress.class` annotation. Updated examples to use `spec.ingress_class_name = "nginx"`, matching the Kubernetes v1 Ingress field exposed by the Terraform Kubernetes provider.
- The Route 53 example always created a CNAME from the load balancer hostname and could not handle controllers that publish an IP address. Added local values that choose CNAME for hostname targets and A for IP targets.
- The Route 53 output indexed `aws_route53_record.main[0]` whenever `create_dns_record` was true, even if `route53_zone_id` was empty and the record count was zero. Updated the conditional to match the resource count condition.
- The Google Cloud DNS example referenced `kubernetes_ingress_v1.main` without defining it. Added the missing Ingress resource and load balancer wait configuration.
- The Google Cloud DNS data source and local status reference did not account for `create_dns_record = false`. Added `count` and indexed references consistent with the Route 53 example.
- The multi-path example used `nginx.ingress.kubernetes.io/rewrite-target = "/$2"` without regex paths or capture groups. Removed the rewrite annotation because the shown Prefix paths do not define `$2`.
- The multi-path module usage passed `route53_zone_id` to a module that did not define DNS support in the example. Removed the unsupported argument.
- The rate-limit example converted requests per minute to a fractional `limit-rps`. Updated it to use ingress-nginx's `limit-rpm` annotation and calculate the burst multiplier from the RPM limit.
- The introduction implied an ingress controller always creates a load balancer. Updated the wording because controllers may create or use a load balancer depending on the controller and environment.
- Fixed the metadata description typo from `CloudDNS` and a trailing `for` to `Cloud DNS` and a complete sentence.

## Review Notes
The examples still use ingress-nginx-compatible annotations. ingress-nginx documentation now states that maintenance ended after March 2026, so new deployments should use a maintained controller or update the annotations for the selected controller. Terraform was not installed in the local environment, so validation was performed by static review against official documentation rather than by running `terraform validate`.
