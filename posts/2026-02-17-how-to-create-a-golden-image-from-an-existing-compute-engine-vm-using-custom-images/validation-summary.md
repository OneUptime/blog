# Validation Summary: How to Create a Golden Image from an Existing Compute Engine VM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Compute Engine custom images and image families
- Google Cloud CLI (`gcloud`)
- Debian 12 Linux administration
- Terraform Google provider
- Cloud Build
- Packer

## Sources Consulted
- Google Cloud Compute Engine: Create custom images: https://cloud.google.com/compute/docs/images/create-custom
- Google Cloud Compute Engine: OS images and image families: https://cloud.google.com/compute/docs/images
- Google Cloud Compute Engine: Image families best practices: https://cloud.google.com/compute/docs/images/image-families-best-practices
- Google Cloud Compute Engine: Deprecate a custom image: https://cloud.google.com/compute/docs/images/deprecate-custom
- Google Cloud SDK: `gcloud compute images create`: https://cloud.google.com/sdk/gcloud/reference/compute/images/create
- Google Cloud SDK: `gcloud compute instances create`: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK: `gcloud compute instance-templates create`: https://cloud.google.com/sdk/gcloud/reference/compute/instance-templates/create
- Google Cloud SDK: `gcloud compute images deprecate`: https://cloud.google.com/sdk/gcloud/reference/compute/images/deprecate
- Terraform Google provider: `google_compute_image`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_image
- Terraform Google provider: `google_compute_instance_template`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance_template
- Google Cloud Build configuration schema: https://cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build substitutions: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values

## Issues Found
- The Debian 12 setup used `pip3 install flask gunicorn` directly against the system Python environment. Debian 12 commonly enforces externally managed Python environments, so this can fail or encourage unsafe system package modifications. Changed the example to install `python3-venv` and install Flask and Gunicorn into `/opt/my-app-venv`.
- The setup used `ufw` without installing it first. Added `ufw` to the package installation command.
- The firewall commands enabled UFW before allowing SSH, which can disconnect the active SSH session. Reordered the commands so SSH, HTTP, and HTTPS are allowed before enabling UFW, and used `ufw --force enable` for noninteractive execution.
- The cleanup command `sudo truncate -s 0 /var/log/**/*.log` depends on Bash `globstar`, which is usually disabled by default. Replaced it with a `find` command that recursively truncates `.log` files reliably.
- The post said GCP technically allows image creation from a running instance, but the Google Cloud CLI requires `--force` for that case. Updated the explanation to include the `--force` flag caveat.

## Review Notes
- The Compute Engine image creation, image family, storage location, instance creation, instance template, image deprecation, Terraform, and Cloud Build examples are otherwise aligned with current official documentation.
- The Cloud Build example is intentionally simplified and uses `sleep 300`; a production pipeline should use an explicit readiness signal from the setup script before creating the image.
