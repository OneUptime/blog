# Validation Summary: How to Build Terraform Custom Provider for Internal Kubernetes Platform APIs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform Plugin SDK v2
- Terraform provider installation and provider source addresses
- Go
- Kubernetes client-go
- Kubernetes dynamic client and unstructured custom resources
- Kubernetes Custom Resource Definitions

## Sources Consulted
- HashiCorp Terraform Plugin SDK v2 schema documentation: https://developer.hashicorp.com/terraform/plugin/sdkv2/schemas
- Terraform Plugin SDK helper/schema Go package documentation: https://pkg.go.dev/github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema
- Terraform provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform CLI provider installation and filesystem mirror documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform built-in functions documentation for `pathexpand`: https://developer.hashicorp.com/terraform/language/functions
- Kubernetes client-go documentation: https://github.com/kubernetes/client-go
- Kubernetes apimachinery unstructured package documentation: https://pkg.go.dev/k8s.io/apimachinery/pkg/apis/meta/v1/unstructured

## Issues Found
- The provider configuration referenced `resourceDatabase()` and `dataSourceClusterInfo()` without defining them anywhere in the tutorial. Removed those placeholder entries so the shown provider example is self-contained.
- The resource example imported both Terraform SDK `helper/schema` and Kubernetes `runtime/schema` with the same package name, which would not compile. Aliased the Kubernetes package as `k8sschema`.
- The create function assigned the Kubernetes create result to `result` without using it, which would cause a Go compile error. Changed the assignment to `_`.
- The original import example used `schema.ImportStatePassthroughContext`, but the read function depended on `name` and `namespace` fields that passthrough import would not populate. Replaced it with a small importer that accepts IDs in `namespace/name` format and sets both fields.
- The read function type-asserted `spec` and `status` directly, which could panic if the API response omitted those fields. Replaced direct assertions with `unstructured.NestedMap` and `unstructured.NestedString`.
- The read and delete functions returned errors for Kubernetes NotFound responses. Updated read to clear Terraform state and delete to treat NotFound as successful, matching expected Terraform resource lifecycle behavior.
- The update function only updated `image` and `replicas`, even though `environment` and `resources` were mutable schema fields. Added helper functions and updated the update path to write all mutable spec fields.
- The local provider install command copied the binary without a versioned provider filename. Updated it to install `terraform-provider-myplatform_v1.0.0` in the unpacked local mirror layout.
- The Terraform example passed `~/.kube/config` directly to the provider. Updated it to use `pathexpand("~/.kube/config")` so Terraform expands the home directory before passing the path to Go client configuration loading.

## Review Notes
The examples are still illustrative and assume an existing `platform.mycompany.com/v1` `Application` CRD with matching `spec` and `status` fields. A temporary Go compile check could not be run in this environment because the `go` command is not installed, so the final review is based on official API documentation and static inspection.
