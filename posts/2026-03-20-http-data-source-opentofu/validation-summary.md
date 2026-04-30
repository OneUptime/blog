# Validation Summary: How to Use the http Data Source in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp `http` provider
- HTTP and REST APIs
- GitHub REST API
- AWS public IP ranges JSON

## Sources Consulted
- HashiCorp `http` provider data source docs: https://github.com/hashicorp/terraform-provider-http/blob/main/docs/data-sources/http.md
- HashiCorp `http` provider changelog: https://github.com/hashicorp/terraform-provider-http/blob/main/CHANGELOG.md
- OpenTofu data sources docs: https://opentofu.org/docs/language/data-sources/
- OpenTofu custom conditions docs: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu version constraints docs: https://opentofu.org/docs/language/expressions/version-constraints/
- OpenTofu input variables docs: https://opentofu.org/docs/language/values/variables/
- OpenTofu ephemerality docs: https://opentofu.org/docs/language/ephemerality/
- GitHub releases REST API docs: https://docs.github.com/en/rest/releases/releases
- AWS Instance Metadata Service docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- AWS instance metadata options docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html
- AWS IP address ranges docs: https://docs.aws.amazon.com/vpc/latest/userguide/aws-ip-ranges.html
- Verified example endpoint: https://api.ipify.org?format=json
- Verified example endpoint: https://api.github.com/repos/opentofu/opentofu/releases/latest
- Verified example endpoint: https://ip-ranges.amazonaws.com/ip-ranges.json

## Issues Found
- The setup example pinned the provider to `~> 3.0`, but later examples rely on features added in `hashicorp/http` `v3.3.0` such as `retry`. I updated the version constraint to `~> 3.3` so the setup matches the features demonstrated in the post.
- The GitHub example used the older `application/vnd.github.v3+json` media type. GitHub's current REST API docs recommend `application/vnd.github+json`, so I updated the request header accordingly.
- The retry example said the `retry` block required provider version `3.4+`, but the provider changelog shows `retry` was added in `hashicorp/http` `v3.3.0`. I corrected the version note to `3.3+`.
- The EC2 metadata example used a plain GET against IMDS. That is not generally valid when IMDSv2 tokens are required, and the `http` data source cannot perform the token-fetch PUT request needed for IMDSv2. I replaced that section with an AWS public IP range metadata example that works with a supported GET request.
- The remote `tfvars` example fetched a generic JSON file named `opentofu.json`, which did not match the section title. I updated the example to use a remote `.tfvars.json` path so the implementation matches the claim.
- The caching section said the data source is fetched on every plan and apply and included a `terraform_data` trigger example that did not actually cache or control refresh behavior for the `http` data source. I rewrote the explanation to match OpenTofu's documented data-source behavior and removed the incorrect trigger example.
- The conclusion recommended ephemeral variables for request tokens. OpenTofu ephemeral variables are limited to specific ephemeral contexts and are not general-purpose protection for `http` data source request headers. I changed the guidance to recommend sensitive variables and protecting state and plan files.

## Review Notes
- The provider supports `GET`, `HEAD`, and `POST`, but the post focuses on GET-based examples. That is acceptable for the scope of this guide.
- The provider documentation warns that data fetched from endpoints you do not control should be treated as untrusted, even when TLS verification succeeds.
