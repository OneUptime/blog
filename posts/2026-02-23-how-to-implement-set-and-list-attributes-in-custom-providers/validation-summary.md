# Validation Summary: How to Implement Set and List Attributes in Custom Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform Plugin Framework
- Go
- Terraform collection schema attributes: lists, sets, maps, and nested attributes
- Terraform Plugin Framework validators

## Sources Consulted
- HashiCorp Terraform Plugin Framework list types documentation: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/types/list
- HashiCorp Terraform Plugin Framework set types documentation: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/types/set
- HashiCorp Terraform Plugin Framework list nested attributes documentation: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/attributes/list-nested
- HashiCorp Terraform Plugin Framework data access documentation: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/accessing-values
- HashiCorp Terraform Plugin Framework data concepts documentation: https://developer.hashicorp.com/terraform/plugin/framework/handling-data/terraform-concepts
- HashiCorp Terraform language type constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Go package documentation for resource schema attributes: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource/schema
- Go package documentation for framework types: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/types
- Go package documentation for list validators: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework-validators/listvalidator
- Verified referenced OneUptime links returned HTTP 200.

## Issues Found
- The CRUD example used `intSliceToIntSlice(ports)`, which was undefined and would not compile as shown. Changed it to pass `ports` directly to the API request.
- The list response handling treated any zero-length `sg.ExposedPorts` response as null, which incorrectly collapses an explicitly empty collection into an absent value. Changed the logic to distinguish `nil` from an empty slice, preserving empty lists as empty Terraform lists.
- The list conversion diagnostics were appended but not checked before writing state. Added a diagnostic error check before `resp.State.Set`.
- The `setCollectionFromAPI` helper ignored diagnostics from `types.SetValueFrom`, which can hide conversion errors. Changed the helper to return both `types.Set` and `diag.Diagnostics`, and to use `types.SetValue` for the empty set case.
- The CIDR validation regex accepted invalid IPv4 octets and prefix lengths while claiming to validate CIDR blocks. Replaced it with a bounded IPv4 CIDR-notation regex and adjusted the diagnostic message to match what the regex validates.

## Review Notes
The examples remain illustrative snippets and omit imports, resource type definitions, and the example `api` package. The Terraform Plugin Framework APIs used for `ListAttribute`, `SetAttribute`, `MapAttribute`, `ListNestedAttribute`, `SetNestedAttribute`, `ElementsAs`, `ListValueFrom`, `SetValueFrom`, `MapValueFrom`, and `listvalidator.ValueStringsAre` match current documented APIs.
