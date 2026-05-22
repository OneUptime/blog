# Validation Summary: How to Use the HTTP Provider for API Checks in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp HTTP provider
- HashiCorp AWS provider
- GitHub REST API
- HashiCorp Vault health API

## Sources Consulted
- HashiCorp HTTP provider `http` data source documentation: https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- HashiCorp HTTP provider source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-http/main/docs/data-sources/http.md
- Terraform custom conditions documentation: https://developer.hashicorp.com/terraform/language/validate
- HashiCorp AWS provider `aws_security_group_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- GitHub REST API release documentation: https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#get-the-latest-release
- HashiCorp Vault `/sys/health` API documentation: https://developer.hashicorp.com/vault/api-docs/system/health

## Issues Found
- The introduction stated that the `http` data source makes a GET request without qualification. The current provider supports `GET`, `HEAD`, and `POST`, with GET as the default, so the wording was changed to "By default."
- The health check example was described as verifying service health before deployment, but it only exposed the status in outputs. Added a `lifecycle` `postcondition` so Terraform fails if the endpoint does not return HTTP 200.
- The SSL section implied certificate validation. The HTTP provider verifies HTTPS using normal certificate chain and hostname checks, but it does not inspect certificate metadata such as expiry. Renamed the section and output to describe HTTPS endpoint accessibility.
- The conclusion said POST requests require the external provider. Current HTTP provider documentation supports read-only POST requests with `method = "POST"` and `request_body`, so the recommendation was narrowed to state-changing requests, custom authentication flows, or processing beyond Terraform expressions.

## Review Notes
- The examples use `aws_security_group_rule`, which is still supported but no longer the AWS provider's preferred security group rule resource. The current provider documentation recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for new configurations.
