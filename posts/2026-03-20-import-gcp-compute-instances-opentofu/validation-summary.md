# Validation Summary: How to Import GCP Compute Instances into OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Google Cloud Compute Engine
- Google Cloud CLI (`gcloud`)
- Google provider HCL resources for Terraform and OpenTofu
- `jq`

## Sources Consulted
- OpenTofu import docs: https://opentofu.org/docs/language/import/
- Google Cloud CLI `gcloud compute instances describe`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/describe
- View the source image of a VM: https://cloud.google.com/compute/docs/instances/view-vm-image
- Compute Engine instances REST resource: https://cloud.google.com/compute/docs/reference/rest/v1/instances
- Google provider `google_compute_instance` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_instance.html.markdown
- Google provider `google_compute_attached_disk` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_attached_disk.html.markdown
- Google provider `google_compute_disk` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_disk.html.markdown
- Set up OS Login: https://cloud.google.com/compute/docs/oslogin/set-up-oslogin
- Create and use Spot VMs: https://cloud.google.com/compute/docs/instances/create-use-spot

## Issues Found
- The Step 1 `jq` example treated `.disks[0].source` as an image identifier, but that field is the attached persistent disk URL. I changed the snippet to collect the existing boot disk name and other instance fields that `gcloud compute instances describe` actually returns.
- The Step 2 boot disk block used `initialize_params`, which describes creating a new boot disk. For an imported VM, the safer matching configuration is to reference the existing disk with `boot_disk.source`, so I updated the example accordingly.
- The commented `access_config` example used `nat_ip = ""`, which is not the correct way to model an ephemeral external IP. I replaced it with the valid empty `access_config {}` form and a static-IP example.
- The post omitted the provider requirement to ignore `attached_disk` changes on `google_compute_instance` when managing extra disks with `google_compute_attached_disk`. I added that lifecycle setting and updated the conclusion.

## Review Notes
- OpenTofu `import` blocks are currently documented as experimental, although the syntax used in the post is valid.
- The short import IDs shown in the post are valid for `google_compute_instance`, `google_compute_disk`, and `google_compute_attached_disk`; the provider also accepts long `projects/...` forms.
