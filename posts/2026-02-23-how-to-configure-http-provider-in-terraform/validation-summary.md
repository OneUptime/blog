# Validation Summary: How to Configure HTTP Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp HTTP provider
- HCL
- HTTP APIs
- TLS configuration
- Terraform data sources and lifecycle postconditions
- AWS security groups and IP ranges
- GitHub REST API

## Sources Consulted
- HashiCorp Terraform Registry: HTTP provider `http` data source - https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- HashiCorp HTTP provider source documentation - https://raw.githubusercontent.com/hashicorp/terraform-provider-http/main/docs/data-sources/http.md
- HashiCorp HTTP provider changelog - https://raw.githubusercontent.com/hashicorp/terraform-provider-http/main/CHANGELOG.md
- Terraform lifecycle meta-argument reference - https://docs.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS VPC documentation: AWS IP address ranges - https://docs.aws.amazon.com/vpc/latest/userguide/aws-ip-ranges.html
- GitHub Docs: REST API endpoints for releases - https://docs.github.com/rest/releases

## Issues Found
1. **Incorrect status-code failure behavior**: The post said the HTTP provider fails by default when the response status code is not in the 200 range, and implied accepted status codes could be customized directly. In `hashicorp/http` provider 3.x, response status codes are exposed through `status_code` but are not automatically checked. Updated the error-handling section to use `lifecycle` postconditions with `self.status_code`.

2. **Health-check example did not actually block deployment**: The example calculated a local boolean but did not fail the Terraform run if the dependency was unhealthy. Added a postcondition that requires HTTP 200 and a JSON body status of `healthy`.

3. **Mismatched remote configuration comment**: The remote configuration example said it fetched YAML, but the URL ended in `.json` and the body was parsed with `jsondecode()`. Changed the comment to say JSON.

4. **Overstated data source refresh behavior**: The limitations section said the HTTP provider runs during every `terraform plan` and every plan/apply makes a request. Terraform reads data sources during planning when arguments are known, and otherwise can defer reads until apply. Reworded this to describe refresh behavior more accurately.

## Review Notes
The examples use current HTTP provider 3.x attributes including `response_body`, `response_headers`, `status_code`, `method`, `request_body`, `ca_cert_pem`, `insecure`, and `retry`. The post pins `~> 3.4`, which remains compatible with the documented 3.x provider behavior reviewed here.
