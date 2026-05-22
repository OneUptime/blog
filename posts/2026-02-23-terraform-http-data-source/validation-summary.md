# Validation Summary: How to Use the http Data Source in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform `hashicorp/http` provider
- Terraform data sources
- Terraform `check` blocks
- HCL
- HTTP APIs
- AWS Security Groups and EC2 examples
- HashiCorp Vault API example

## Sources Consulted
- HashiCorp HTTP provider `http` data source documentation: https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- HashiCorp HTTP provider source and generated docs: https://github.com/hashicorp/terraform-provider-http
- Terraform check block and validation documentation: https://developer.hashicorp.com/terraform/language/validate
- Terraform data block reference: https://developer.hashicorp.com/terraform/language/block/data
- Terraform sensitive data guidance: https://developer.hashicorp.com/terraform/language/manage-sensitive-data

## Issues Found
- The post stated that the `http` data source supports GET requests only. The current `hashicorp/http` provider supports GET, HEAD, and POST, with POST intended for read-only URLs. Updated the limitation to reflect the supported methods and kept the guidance to use another mechanism for PUT, PATCH, or DELETE.
- The post stated that OAuth flows, mutual TLS, and other complex authentication mechanisms are not supported. The provider supports request headers, custom CA certificates, and client certificates, but does not perform OAuth flows. Updated the limitation to distinguish supported TLS options from unsupported authentication workflows.
- The error handling section said the data source fails by default on non-success status codes. The provider exposes `status_code`, and its retry block applies to client errors and most 5xx responses. Updated the text to recommend validating expected statuses with `status_code`, `check` blocks, or lifecycle postconditions.
- The optional API example used `count` to skip a request, but did not handle a non-200 response after the request was made. Updated the local value to check `status_code == 200` before calling `jsondecode()`.
- The "Fetching SSL Certificate Information" example only inspected HTTP response headers, not certificate details. Renamed the section and comment to describe response header inspection accurately.

## Review Notes
The remaining HCL examples use current Terraform syntax and provider attributes. The `check` block example is consistent with Terraform's official validation documentation, but check blocks require Terraform v1.5.0 or later.
