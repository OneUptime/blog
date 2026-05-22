# Validation Summary: How to Implement Timeouts in Custom Provider Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Plugin Framework
- Terraform Plugin Framework Timeouts module
- Terraform Plugin SDK v2 retry helper
- Go context deadlines and polling
- Terraform HCL resource timeout configuration
- Terraform provider logging with `tflog`

## Sources Consulted
- HashiCorp Developer: Terraform Plugin Framework timeouts, https://developer.hashicorp.com/terraform/plugin/framework/resources/timeouts
- HashiCorp Developer: Terraform Plugin Framework resource create lifecycle, https://developer.hashicorp.com/terraform/plugin/framework/resources/create
- HashiCorp Developer: Terraform Plugin Framework resource delete lifecycle, https://developer.hashicorp.com/terraform/plugin/framework/resources/delete
- HashiCorp Developer: Terraform Plugin SDK v2 retries and customizable timeouts, https://developer.hashicorp.com/terraform/plugin/sdkv2/resources/retries-and-customizable-timeouts
- HashiCorp Developer: Writing provider log output with `tflog`, https://developer.hashicorp.com/terraform/plugin/log/writing
- Go package documentation: `github.com/hashicorp/terraform-plugin-framework-timeouts/resource/timeouts`, https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework-timeouts/resource/timeouts

## Issues Found
- The post said the Plugin Framework provides built-in timeout support. HashiCorp documents timeout support as coming from the companion `terraform-plugin-framework-timeouts` module used with the Framework. Updated the wording to avoid implying the timeout helpers are built directly into the Framework package.

## Review Notes
- The block-based `timeouts { ... }` configuration shown in the post is supported. HashiCorp currently recommends nested attributes for new Plugin Framework providers, but block syntax remains valid, especially for providers preserving SDKv2-style configuration.
- The SDKv2 `helper/retry` package is still documented and can be used from Framework-based provider code, but providers should ensure retry/helper timeouts fit inside any enclosing context deadline so timeout diagnostics remain clear.
