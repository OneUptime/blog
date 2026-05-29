# Validation Summary: How to Automate Organization Policy Enforcement Testing with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Organization Policy
- Terraform Google provider
- Terratest
- Go Google API clients
- Cloud Build
- Cloud Scheduler
- Pub/Sub

## Sources Consulted
- Terraform Registry: `google_org_policy_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/org_policy_policy
- Google Cloud Resource Manager organization policy constraints: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Google Cloud Storage public access prevention: https://cloud.google.com/storage/docs/public-access-prevention
- Google Cloud Storage uniform bucket-level access: https://cloud.google.com/storage/docs/uniform-bucket-level-access
- Google Cloud Compute Engine `instances.insert` REST documentation: https://cloud.google.com/compute/docs/reference/rest/v1/instances/insert
- Go package documentation for `google.golang.org/api/storage/v1`: https://pkg.go.dev/google.golang.org/api/storage/v1
- Google Cloud Build trigger documentation: https://cloud.google.com/build/docs/triggers
- Google Cloud Build scheduled builds documentation: https://cloud.google.com/build/docs/schedule-builds
- Google Cloud SDK reference for `gcloud builds triggers create manual`: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/manual
- Google Cloud SDK reference for `gcloud scheduler jobs create http`: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http

## Issues Found
- The Cloud Storage policy comment said it prevented public access, but the Terraform resource used `storage.uniformBucketLevelAccess`, which enforces uniform bucket-level access rather than public access prevention. Updated the comment to match the actual constraint.
- The Go test snippet imported `cloudresourcemanager/v1` without using it, which would cause a Go compile error. Removed the unused import.
- The bucket exception test used a fixed bucket name and omitted uniform bucket-level access even though the earlier policy enforces it for new buckets. Updated the example to use a unique bucket name and set `IamConfiguration.UniformBucketLevelAccess.Enabled` to `true`.
- The exception test dereferenced `createdBucket` immediately after `assert.NoError`, which could panic if bucket creation failed. Wrapped the follow-up assertion and cleanup in an `err == nil` guard.
- The Cloud Build test command only matched `TestOrgPolicies`, so it did not run the location enforcement or exception tests shown in the post. Updated the `go test -run` expression to include all three test functions.
- The drift detection command used a nonexistent `gcloud builds triggers create scheduled` subcommand. Replaced it with the documented `gcloud builds triggers create manual` command and noted that the manual trigger should be scheduled with Cloud Scheduler.
- The drift detection build attempted to publish a Pub/Sub alert from the `hashicorp/terraform` image, which does not provide the `gcloud` CLI. Split alert publishing into a Google Cloud CLI build step.
- The drift detection build used a pipeline with `tee`, which would not reliably preserve Terraform's `-detailed-exitcode` result in plain `sh`. Changed the command to capture the Terraform exit code directly, print the saved plan output, and handle drift separately from plan errors.

## Review Notes
The snippets are illustrative and still use placeholder project, organization, repository, region, connection, and service account values. In a production version, the integration tests should avoid `t.Parallel()` if they share and destroy the same org policy state, or each test should create its own isolated fixture.
