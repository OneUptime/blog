# Validation Summary: How to Create Terraform Resource Schemas

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Terraform Plugin Framework (`github.com/hashicorp/terraform-plugin-framework`)
- Terraform Plugin Framework Validators (`github.com/hashicorp/terraform-plugin-framework-validators`)
- Terraform Plugin Testing (`github.com/hashicorp/terraform-plugin-testing`)
- Go (resource interface implementation, struct tags, custom types)
- Terraform provider development (resource schemas, attributes, plan modifiers, CRUD)

## Sources Consulted
- Terraform Plugin Framework `stringplanmodifier` package: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier
- Terraform Plugin Framework `path` package: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-framework/path
- Terraform Plugin Framework resource/schema documentation
- Terraform Plugin Framework validator and planmodifier interface definitions
- HashiCorp Terraform Plugin Framework tutorials and examples

## Issues Found
- **Missing import in custom plan modifier example**: The `defaultFromAttribute` plan modifier code block uses `path.Root(m.attributeName)` to fetch an attribute from the plan, but the import block omitted `github.com/hashicorp/terraform-plugin-framework/path`. Added the import so the example compiles as written.

All other technical content verified accurate:
- Resource interface signatures (`Metadata`, `Schema`, `Create`, `Read`, `Update`, `Delete`) match the framework.
- Attribute type names (`StringAttribute`, `Int64Attribute`, `Float64Attribute`, `BoolAttribute`, `ListAttribute`, `SetAttribute`, `MapAttribute`, `SingleNestedAttribute`, `ListNestedAttribute`) are correct.
- Plan modifier package paths and function names (`stringplanmodifier.UseStateForUnknown`, `RequiresReplace`, `RequiresReplaceIf`) are correct.
- `RequiresReplaceIf` signature `(RequiresReplaceIfFunc, description, markdownDescription string)` and the `RequiresReplaceIfFuncResponse` type are correct.
- Validator package paths and function names (`stringvalidator.LengthBetween`, `RegexMatches`, `OneOf`; `int64validator.Between`, `OneOf`) are correct.
- Custom validator interface methods (`Description`, `MarkdownDescription`, `ValidateString`) and the `validator.StringRequest`/`validator.StringResponse` types are correct.
- `tfsdk` struct tags, `types.StringValue`, `types.Int64Value`, etc. are correct.
- Acceptance testing harness (`resource.Test`, `resource.TestCase`, `ProtoV6ProviderFactories`, `TestCheckResourceAttr`, `TestCheckResourceAttrSet`, `ComposeAggregateTestCheckFunc`, `ImportStateVerify`) is correct.

## Review Notes
- Several illustrative code snippets use `regexp.MustCompile(...)` without showing a `regexp` standard-library import in their excerpted import blocks. These are clearly partial snippets meant to be merged into a fuller file, so they were left as is. If readers copy snippets verbatim into a fresh file, they will need to add `"regexp"` to the imports.
- `go get github.com/hashicorp/terraform-plugin-go` is included in setup. It is typically pulled in transitively by the plugin framework, but explicitly fetching it is harmless.
- The post does not mention the framework's first-class `default` package (e.g. `stringdefault.StaticString`), which is the modern, idiomatic way to set defaults for `Optional + Computed` attributes. The custom `defaultFromAttribute` plan modifier shown is still valid, but a future revision could mention `default.String` / `stringdefault` for the common static-default case.
