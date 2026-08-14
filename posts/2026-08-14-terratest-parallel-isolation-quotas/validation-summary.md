# Validation Summary: Run Terratest in Parallel Without Cloud Collisions

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Terratest v1.0.1 and the Terratest Terraform v2 beta module
- Go testing, parallel subtests, contexts, and channel semaphores
- Go test caching and package/test-binary concurrency controls
- Terraform CLI working directories, backends, state locking, workspaces, and graph parallelism
- AWS S3-style backend keys and per-process environment configuration
- Cloud resource naming, network allocation, quotas, and cleanup
- Kubernetes namespaces and cluster-scoped resources

## Sources Consulted

- Terratest v1.0.1 files helper documentation and source: https://pkg.go.dev/github.com/gruntwork-io/terratest@v1.0.1/modules/files and https://github.com/gruntwork-io/terratest/blob/v1.0.1/modules/files/files.go
- Terratest v1.0.1 Terraform helper documentation and source: https://pkg.go.dev/github.com/gruntwork-io/terratest@v1.0.1/modules/terraform and https://github.com/gruntwork-io/terratest/tree/v1.0.1/modules/terraform
- Terratest v1.0.1 option and argument rendering: https://github.com/gruntwork-io/terratest/blob/v1.0.1/modules/terraform/options.go, https://github.com/gruntwork-io/terratest/blob/v1.0.1/modules/terraform/format.go, and https://github.com/gruntwork-io/terratest/blob/v1.0.1/modules/terraform/cmd.go
- Terratest v1.0.1 context helpers: https://github.com/gruntwork-io/terratest/blob/v1.0.1/modules/terraform/apply.go and https://github.com/gruntwork-io/terratest/blob/v1.0.1/modules/terraform/destroy.go
- Terratest random identifier documentation and source: https://pkg.go.dev/github.com/gruntwork-io/terratest@v1.0.1/modules/random and https://github.com/gruntwork-io/terratest/blob/v1.0.1/modules/random/random.go
- Terratest v1.0.1 release, Go requirement, and Terraform v2 beta package: https://github.com/gruntwork-io/terratest/releases/tag/v1.0.1, https://github.com/gruntwork-io/terratest/blob/v1.0.1/go.mod, and https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform/v2@v2.0.0-beta.2
- Terratest guidance on disabling Go test caching: https://terratest.gruntwork.io/docs/testing-best-practices/avoid-test-caching/
- Go `testing` package documentation: https://pkg.go.dev/testing
- Go command test and build flags: https://pkg.go.dev/cmd/go
- Go 1.22 loop-variable semantics: https://go.dev/doc/go1.22
- Terraform initialization and `TF_DATA_DIR`: https://developer.hashicorp.com/terraform/cli/init and https://developer.hashicorp.com/terraform/cli/config/environment-variables#tf_data_dir
- Terraform local and S3 backends: https://developer.hashicorp.com/terraform/language/backend/local and https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform state and state locking: https://developer.hashicorp.com/terraform/language/state and https://developer.hashicorp.com/terraform/language/state/locking
- Terraform CLI workspaces: https://developer.hashicorp.com/terraform/language/state/workspaces and https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform graph walking and apply parallelism: https://developer.hashicorp.com/terraform/internals/graph and https://developer.hashicorp.com/terraform/cli/commands/apply
- RFC 1918 private address space: https://www.rfc-editor.org/info/rfc1918/
- Kubernetes namespace and object-name scoping: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/ and https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Kubernetes cluster-network range guidance: https://kubernetes.io/docs/concepts/cluster-administration/networking/ and https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- AWS VPC overlap restrictions: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html
- AWS resource-name uniqueness examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html, https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html, https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-application-load-balancer.html, and https://docs.aws.amazon.com/cli/latest/reference/logs/create-log-group.html
- AWS tagging, inventory, and account-isolation guidance: https://docs.aws.amazon.com/tag-editor/latest/userguide/best-practices-and-strats.html, https://docs.aws.amazon.com/resource-explorer/latest/userguide/using-search.html, and https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/aws-account-management-and-separation.html
- AWS Service Quotas overview: https://docs.aws.amazon.com/servicequotas/latest/userguide/intro.html
- AWS NAT gateway quota-release behavior: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-troubleshooting.html
- Google Cloud quota types and scopes: https://docs.cloud.google.com/docs/quotas/overview

## Issues Found

- The process-global mutation warning mentioned tests with parallel ancestors but omitted tests that are themselves parallel. Updated it to match Go's documented prohibition on `t.Setenv` and `t.Chdir` in both cases.
- The loop-variable note implied the pinned example might need the legacy capture. Terratest v1.0.1 requires Go 1.26, so the capture is redundant for this example; the post now says it is required only when the pattern is adapted to pre-Go 1.22 semantics.
- The remote-state section suggested a workspace without noting backend support. Updated it to state that a per-run workspace is an option only when the selected backend supports multiple workspaces.
- The locking explanation was broader than Terratest's implementation. Clarified that `Lock: true` affects the apply and destroy calls shown, and that the backend must support locking with any backend-specific locking option enabled. The readiness checklist now requires backend locking to be enabled, not merely supported.
- The `UniqueID` wording could be read as saying separate calls to `UniqueID` and `UniqueId` return the identical identifier. Clarified that the deprecated alias delegates to `UniqueID` and that each call returns a six-character base62 identifier.
- The resource-name introduction referred only to account-global and globally unique scopes even though the examples also include namespace-, cluster-, and Region-scoped names. Updated it to describe the full range of shared naming scopes accurately.
- The semaphore was described as protecting a resource class even though the example releases its slot immediately after apply. Narrowed the description to concurrent API/provisioning calls, reused the already bounded apply context, and explained that a live-resource count quota requires holding the slot until destroy completes.

## Review Notes

- The combined primary example and semaphore usage were compiled successfully against Terratest v1.0.1 in a temporary Go 1.26 module. No cloud deployment was attempted because the referenced Terraform example and credentials are not part of this post.
- Terratest v1.0.1 is the stable v1 release reviewed here; as of the validation date, `modules/terraform/v2` remains a beta package at v2.0.0-beta.2.
- `t.Context()` is canceled immediately before test cleanup callbacks. The example's ordinary deferred destroy runs before that cancellation and is valid; changing it to a `t.Cleanup` callback while deriving the destroy context from `t.Context()` would produce an already-canceled context.
- `go test -timeout=45m` is a per-test-binary hard timeout, not graceful context cancellation. The explicit apply and destroy contexts are therefore still important.
- `terraform.Options.Parallelism` limits eligible Terraform graph operations, not a literal count of cloud API requests. The post correctly preserves that distinction.
- `files.CopyTerraformFolderToTemp` does not automatically remove its temporary copy. Long-lived self-hosted runners may want an additional local-directory cleanup after cloud destroy.
- The `BackendConfig` key named `key` is backend-specific and is valid for an S3 backend; other backends may use a different state-address argument.
- The collision examples intentionally span different uniqueness scopes, including partition-global, account, Region, hosted-zone, namespace, and cluster scopes; each remains a valid shared-resource collision risk.
- Every external URL listed in the post returned a successful HTTP response during validation.
