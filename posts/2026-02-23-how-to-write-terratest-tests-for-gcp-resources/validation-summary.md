# Validation Summary: How to Write Terratest Tests for GCP Resources

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Terraform
- Terratest
- Go
- Google Cloud Platform
- Compute Engine
- VPC networks and firewall rules
- Cloud Storage
- Cloud SQL for PostgreSQL
- Google Kubernetes Engine
- GitHub Actions

## Sources Consulted
- Terratest GCP package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest@v0.56.0/modules/gcp
- Terratest GCP compute helper source: https://raw.githubusercontent.com/gruntwork-io/terratest/v0.56.0/modules/gcp/compute.go
- Terratest GCP storage helper source: https://raw.githubusercontent.com/gruntwork-io/terratest/v0.56.0/modules/gcp/storage.go
- Terratest GCP provider environment variable source: https://raw.githubusercontent.com/gruntwork-io/terratest/v0.56.0/modules/gcp/provider.go
- Google Cloud Storage Go client documentation: https://pkg.go.dev/cloud.google.com/go/storage
- Google Compute Engine Go API documentation: https://pkg.go.dev/google.golang.org/api/compute/v1
- Google Kubernetes Engine Go API documentation: https://pkg.go.dev/google.golang.org/api/container/v1
- Google Cloud SDK `gcloud auth application-default login` reference: https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login
- google-github-actions/auth documentation: https://github.com/google-github-actions/auth
- HashiCorp setup-terraform action documentation: https://github.com/hashicorp/setup-terraform
- GitHub setup-go action documentation: https://github.com/actions/setup-go

## Issues Found
- The post used Terratest helper functions that do not exist in the current `github.com/gruntwork-io/terratest/modules/gcp` package: `GetNetwork`, `GetSubnets`, `GetSubnet`, `GetStorageBucket`, `GetGKECluster`, and `GetFirewallRule`. I changed those examples to use Terratest's available helpers where applicable and the official Google Cloud Go clients for the missing resource lookups.
- The Compute Engine example called `gcp.FetchInstance(t, projectId, zone, instanceName)`, but the current Terratest signature is `FetchInstance(t, projectID, name)`. I corrected the call.
- The Compute Engine example asserted that every disk has `DiskEncryptionKey` populated. That field is not populated for the common Google-managed encryption case, so the assertion would incorrectly fail. I replaced it with a zone validation using Terratest's `GetZone` helper.
- The VPC example passed static subnet names but later looked up names with the generated suffix. I made the Terraform input subnet names match the later lookup.
- The Cloud Storage example used bucket fields from the JSON API shape (`Versioning.Enabled`, `Lifecycle.Rule`) while the Go Cloud Storage client exposes `VersioningEnabled` and `Lifecycle.Rules`. I updated the example to retrieve bucket attributes with `cloud.google.com/go/storage` and use the correct fields.
- The GKE example used a nonexistent Terratest helper. I changed it to call the official Container API with the `projects/{project}/locations/{location}/clusters/{cluster}` resource path.
- The firewall example used a nonexistent Terratest helper. I changed it to retrieve firewall rules through `gcp.NewComputeService(t).Firewalls.Get(...)`.
- The Cloud SQL snippet had a duplicate `database/sql` import after edits. I removed the duplicate.

## Review Notes
- The CI example remains technically valid, but newer major versions of some GitHub Actions exist. The pinned versions shown are still plausible and were not changed because the snippet does not depend on the newest major release.
- The Cloud SQL connectivity test assumes the Terraform module permits the test runner to reach the public Cloud SQL endpoint and configures SSL appropriately. That is module-specific and should be documented in the module under test.
