# Validation Summary: How to Use Google Cloud Buildpacks to Containerize a Go App Without Writing a

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Google Cloud Buildpacks
- Cloud Native Buildpacks
- pack CLI
- Cloud Build
- Cloud Run
- Artifact Registry
- Terraform Google provider

## Sources Consulted
- Google Cloud Buildpacks overview: https://cloud.google.com/docs/buildpacks/overview
- Google Cloud Buildpacks Go configuration: https://docs.cloud.google.com/docs/buildpacks/go
- Google Cloud Buildpacks runtime lifecycle: https://docs.cloud.google.com/docs/buildpacks/runtime-support
- Google Cloud Buildpacks builders: https://docs.cloud.google.com/docs/buildpacks/builders
- Google Cloud Buildpacks Cloud Build usage: https://docs.cloud.google.com/docs/buildpacks/build-application
- Google Cloud Buildpacks environment variables: https://docs.cloud.google.com/docs/buildpacks/set-environment-variables
- Google Cloud Buildpacks Procfile documentation: https://docs.cloud.google.com/docs/buildpacks/about-procfile
- Cloud Run source deployments: https://cloud.google.com/run/docs/deploying-source-code
- Cloud Native Buildpacks project descriptor reference: https://buildpacks.io/docs/reference/config/project-descriptor/
- Cloud Native Buildpacks reproducibility: https://buildpacks.io/docs/for-app-developers/concepts/reproducibility/
- Cloud Native Buildpacks pack rebase command: https://buildpacks.io/docs/for-platform-operators/how-to/integrate-ci/pack/cli/pack_rebase/
- Terraform Google Cloud Run v2 service resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- Terraform Google Cloud Run v2 service IAM resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service_iam

## Issues Found
- Go 1.22 is deprecated in Google Cloud Buildpacks as of 2026-01-28 and is scheduled for decommissioning on 2026-07-28. Updated the examples to Go 1.25, which is currently supported.
- The Go buildpack version variable was incorrectly shown as `GOOGLE_RUNTIME_VERSION`. Updated it to `GOOGLE_GO_VERSION`, the documented Go buildpack variable.
- The Go linker flags variable was incorrectly shown as `GOOGLE_BUILD_ARGS`. Updated it to `GOOGLE_GOLDFLAGS`.
- The Cloud Build pack step did not match Google's documented invocation closely enough. Added `entrypoint: pack`, split the `--builder` and `--env` arguments, added `--network cloudbuild`, and listed the produced image.
- The post described Google Cloud Buildpack output as distroless and claimed no shell or package manager. Updated the wording to Google-managed Ubuntu 22 run images.
- The post implied source is always omitted from the image. Clarified that source is omitted when `GOOGLE_CLEAR_SOURCE=true`.
- The Procfile example pointed at a source directory path. Updated it to use the default Go buildpack executable path shown in Google documentation.
- The reproducible-builds section implied source alone determines identical output. Clarified that the source code, builder image, and buildpack set need to remain the same.
- The security update wording implied existing images are automatically patched in all cases. Updated it to say patched base images are picked up by rebuilding, redeploying from source, or rebasing.

## Review Notes
The Terraform Cloud Run v2 service and IAM examples match the current Google provider resource shapes. The pack, gcloud, Terraform, and Go CLIs were not installed in the local environment, so command verification was performed against official documentation rather than local `--help` output.
