# Validation Summary: How to Configure phpIPAM API for Automated IPv4 Address Tracking

## Status
validated

## Post Type
Guide

## Technologies Covered
- phpIPAM REST API
- IPv4 address management
- Bash
- curl
- jq
- Terraform

## Sources Consulted
- phpIPAM API documentation: https://www.phpipam.net/api-documentation/
- phpIPAM API reference: https://www.phpipam.net/api/api_reference/
- phpIPAM schema defaults (`ipTags` values): https://raw.githubusercontent.com/phpipam/phpipam/master/db/SCHEMA.sql
- phpIPAM changelog (`first_free` endpoints and URL rewriting notes): https://raw.githubusercontent.com/phpipam/phpipam/master/misc/CHANGELOG
- Terraform phpIPAM provider docs: https://registry.terraform.io/providers/lord-kyron/phpipam/latest/docs
- Terraform phpIPAM provider usage/docs: https://raw.githubusercontent.com/lord-kyron/terraform-provider-phpipam/master/docs/index.md
- Terraform phpIPAM address resource docs: https://raw.githubusercontent.com/lord-kyron/terraform-provider-phpipam/master/docs/resources/address.md
- Terraform phpIPAM first free address data source docs: https://raw.githubusercontent.com/lord-kyron/terraform-provider-phpipam/master/docs/data-sources/first_free_address.md
- HashiCorp Terraform provider requirements: https://developer.hashicorp.com/terraform/language/providers/requirements

## Issues Found
- The subnet-listing example claimed to show subnets from section 1, but the original endpoint `/api/myapp/subnets/` returns subnets from all sections. I corrected it to `/api/myapp/sections/1/subnets/` to match the explanation and the official API reference.
- The setup steps omitted a documented prerequisite: phpIPAM requires URL rewriting for API routes. I added that prerequisite to the enablement section.
- The examples used plain HTTP URLs. The official phpIPAM API docs recommend SSL for API authentication, and static app authentication requires it. I updated the example URLs to `https://`.
- The tag mapping line implied that numeric tag IDs are universal. In phpIPAM they are default stock values and can be customized. I clarified that the listed IDs are defaults and pointed readers to `/api/myapp/addresses/tags/` for local verification.
- The Terraform example used `server` instead of the current provider argument `endpoint`, and it omitted the provider source declaration needed for a community provider. I corrected the provider configuration to use `endpoint = "https://phpipam.example.com/api"` and added `required_providers` with `source = "lord-kyron/phpipam"`.
- The Terraform example omitted the `lifecycle.ignore_changes` guidance documented by the provider when combining `phpipam_first_free_address` with `phpipam_address`. I added it so repeated plans do not try to reallocate the IP address.

## Review Notes
- Reviewed against the current phpIPAM API documentation for version 1.7.4 and the current `lord-kyron/phpipam` provider docs available on 2026-04-25.
- The shell workflow in the post uses `GET /subnets/{id}/first_free/` followed by `POST /addresses/`, which is supported by phpIPAM. If a future revision wants to cover atomic reservation flows for concurrent automation, phpIPAM also documents `POST /addresses/first_free/{subnetId}/`.
