# Validation Summary: How to Create GCP Machine Images with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Compute Engine
- GCP Machine Images
- OpenTofu with the Google provider
- Google Cloud KMS (CMEK)
- Debian 12 guest initialization

## Sources Consulted
- Google Cloud Machine images overview: https://cloud.google.com/compute/docs/machine-images
- Google Cloud Create machine images: https://cloud.google.com/compute/docs/machine-images/create-machine-images
- Google Cloud Create instances from machine images: https://cloud.google.com/compute/docs/machine-images/create-instance-from-machine-image
- Terraform Google provider `google_compute_machine_image`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_machine_image
- Terraform Google provider `google_compute_instance_from_machine_image`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_from_machine_image
- Terraform Google provider `google_compute_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Debian 12 release notes, "Python Interpreters marked externally-managed": https://www.debian.org/releases/bookworm/amd64/release-notes/ch-information.en.html#python3-pep-668
- Debian package references for `python3-flask` and `gunicorn`: https://packages.debian.org/bookworm/python3-flask and https://packages.debian.org/bookworm/gunicorn

## Issues Found
- The post said machine images capture the "complete" VM state. I changed that wording to match Google Cloud's documentation: machine images store VM configuration, metadata, permissions, and multi-disk data, but not the full runtime state.
- The Step 2 example used `google_compute_instance` with `source_machine_image`. I replaced it with `google_compute_instance_from_machine_image`, which is the provider's dedicated resource for creating instances from a machine image.
- The machine image examples omitted the required beta provider usage. I added `provider = google-beta` to the relevant resources because both `google_compute_machine_image` and `google_compute_instance_from_machine_image` are currently documented as beta resources in the Google provider.
- The Debian 12 startup script used `pip3 install` on the system interpreter. I changed it to install `python3-flask` and `gunicorn` from APT because Debian 12 marks the system Python environment as externally managed.
- The comment implying the machine image resource itself is regional was inaccurate. I corrected that comment so it reflects the CMEK encryption block instead.
- The multi-disk example comment said machine images capture "ALL disks". I narrowed that wording to the two attached persistent disks used in the example.

## Review Notes
- Google Cloud documents operational limits for machine images, including per-source creation limits and per-machine-image instance creation limits.
- Readers still need a configured `google-beta` provider block elsewhere in their OpenTofu configuration for these examples to apply successfully.
