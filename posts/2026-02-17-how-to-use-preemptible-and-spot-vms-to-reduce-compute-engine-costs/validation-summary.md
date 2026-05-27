# Validation Summary: How to Use Preemptible and Spot VMs to Reduce Compute Engine Costs

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Google Cloud Compute Engine
- Spot VMs
- Preemptible VMs
- Managed Instance Groups
- gcloud CLI
- Terraform Google provider
- GitLab Runner
- Python
- Google Cloud Storage client library

## Sources Consulted
- Google Cloud Compute Engine Spot VMs documentation: https://docs.cloud.google.com/compute/docs/instances/spot
- Google Cloud Create and use Spot VMs documentation: https://docs.cloud.google.com/compute/docs/instances/create-use-spot
- Google Cloud Preemptible VM instances documentation: https://docs.cloud.google.com/compute/docs/instances/preemptible
- Google Cloud Compute Engine provisioning models documentation: https://docs.cloud.google.com/compute/docs/instances/provisioning-models
- Google Cloud Terraform Spot VM sample: https://docs.cloud.google.com/compute/docs/samples/compute-spot-instance-create
- Terraform Google provider `google_compute_instance` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- GitLab Runner registration documentation: https://docs.gitlab.com/runner/register/
- Google Cloud Compute Engine VM pricing documentation: https://cloud.google.com/compute/vm-instance-pricing
- Google Cloud Spot VMs pricing page: https://cloud.google.com/spot-vms/pricing

## Issues Found
- The post described Spot and Preemptible VM discounts as "60-91%" in places. Google currently documents Spot and preemptible pricing as discounts of up to 91%, so the wording was changed to "up to 91%."
- The post treated the 30-second preemption notice as a guaranteed warning. Google documents the default shutdown period as best-effort and up to 30 seconds, so the wording was corrected.
- The post described Preemptible VMs as being deprecated and eventually retired. Google recommends Spot VMs for new workloads, but states that new and existing preemptible VMs continue to be available. The wording was corrected to match that.
- The GitLab Runner example used `--registration-token`, which GitLab documents as deprecated and scheduled for removal. The example was changed to use a runner authentication token with `--token`.
- The availability section said `gcloud compute machine-types list` checks Spot VM pricing. That command lists machine types, not Spot pricing. The comment and flags were corrected to show that it checks whether the machine type is available in a zone.
- The cost comparison presented static Spot VM prices as current prices. Google documents Spot prices as dynamic, so the section now labels the numbers as examples and points readers to the Spot pricing page or Cloud Billing Catalog API for current prices.

## Review Notes
- Google Cloud now documents an optional 120-second Spot VM preemption notice duration as a Preview feature. The post focuses on the default 30-second behavior, which remains accurate.
- The Terraform Spot VM scheduling block matches Google Cloud's official sample, including `provisioning_model = "SPOT"`, `preemptible = true`, `automatic_restart = false`, and `instance_termination_action = "STOP"`.
- The local environment did not have `gcloud` or `terraform` installed, so CLI and Terraform validation was performed against official documentation rather than local command output.
