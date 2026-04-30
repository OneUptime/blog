# Validation Summary: How to Create GCP IoT Core Registries with OpenTofu

## Status
validated

## Post Type
Tutorial / Historical reference

## Technologies Covered
- OpenTofu
- HCL
- Google Cloud IoT Core
- Google Cloud Pub/Sub
- Google Cloud IAM
- Terraform Google provider (`hashicorp/google`)

## Sources Consulted
- Google Cloud IAM: Cloud IoT roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/cloudiot
- Google Cloud IoT Core public key formats reference: https://cloud.google.com/php/docs/reference/cloud-iot/latest/V1.PublicKeyFormat
- OpenTofu `init` command documentation: https://opentofu.org/docs/v1.8/cli/commands/init/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/v1.11/cli/commands/apply/
- Terraform Google provider v4.85.0: `google_cloudiot_registry` resource docs: https://github.com/hashicorp/terraform-provider-google/blob/v4.85.0/website/docs/r/cloudiot_registry.html.markdown
- Terraform Google provider v4.85.0: `google_cloudiot_device` resource docs: https://github.com/hashicorp/terraform-provider-google/blob/v4.85.0/website/docs/r/cloudiot_device.html.markdown
- Terraform Google provider v4.85.0: `google_pubsub_topic_iam_*` docs: https://github.com/hashicorp/terraform-provider-google/blob/v4.85.0/website/docs/r/pubsub_topic_iam.html.markdown
- Terraform Google provider v5 upgrade guide (`cloudiot` removals): https://github.com/hashicorp/terraform-provider-google/blob/v4.85.0/website/docs/guides/version_5_upgrade.html.markdown
- Google Cloud .NET IoT client overview noting the retirement date: https://cloud.google.com/dotnet/docs/reference/Google.Cloud.Iot.V1/latest

## Issues Found
- The post presented Cloud IoT Core as if it were still current. I updated the description, introduction note, and summary to state that Cloud IoT Core was retired on August 16, 2023 and that these examples are historical only.
- The post omitted an important provider-version caveat. I added that `google_cloudiot_registry` and `google_cloudiot_device` were removed from the `hashicorp/google` provider in v5.0.0, so the examples only match legacy v4.x provider behavior.
- The API enablement section only enabled Cloud IoT Core, but the examples also create Pub/Sub topics. I added `pubsub.googleapis.com` so the configuration reflects all services used by the snippets.
- The Pub/Sub IAM example only granted publish access on the telemetry topic, even though the registry also publishes state updates to a separate topic. I added a second `google_pubsub_topic_iam_binding` for the state topic.
- The registry `credentials` example used `public_key_certificate { ... }`, but the provider schema requires `public_key_certificate = { ... }` inside the `credentials` block. I corrected the HCL to match the provider documentation.
- The device credential example used `RSA_X509_PEM` with a file named `device-001-public.pem`. Because `RSA_X509_PEM` is for an X.509 certificate and `RSA_PEM` is for a PEM public key, I changed the example to `RSA_PEM` to match the file type implied by the snippet.
- The resource graph did not guarantee service enablement and topic-permission setup before topic/registry creation. I added `depends_on` where needed so the example order matches the service prerequisites shown in the post.

## Review Notes
- This post is technically valid only as an archival reference. It is not deployable against current Google Cloud projects because Cloud IoT Core has been retired.
- The OpenTofu commands shown (`tofu init`, `tofu plan -out=tfplan`, `tofu apply tfplan`) are correct. `tofu` was not installed in the local workspace, so CLI verification was done against the official OpenTofu command documentation rather than local `--help` output.
