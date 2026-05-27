# Validation Summary: How to Use Startup Scripts to Bootstrap a Compute Engine Instance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Compute Engine
- Compute Engine startup scripts
- Compute Engine metadata server
- Cloud Storage
- gcloud CLI
- Docker Engine
- Docker Compose
- Nginx
- Terraform Google provider

## Sources Consulted
- Google Cloud Compute Engine startup scripts documentation: https://docs.cloud.google.com/compute/docs/instances/startup-scripts
- Google Cloud Linux startup scripts documentation: https://docs.cloud.google.com/compute/docs/instances/startup-scripts/linux
- Google Cloud predefined metadata keys documentation: https://docs.cloud.google.com/compute/docs/metadata/predefined-metadata-keys
- Google Cloud metadata querying documentation: https://docs.cloud.google.com/compute/docs/metadata/querying-metadata
- Google Cloud SDK `gcloud compute instances create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Docker Engine Debian installation documentation: https://docs.docker.com/engine/install/debian/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Terraform `google_compute_instance` provider documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance

## Issues Found
- The Cloud Storage startup script example said `--scopes=storage-ro` gives the VM read access to Cloud Storage. This was incomplete because the VM's service account also needs IAM permission to read the bucket or object. Updated the explanation to mention both the OAuth scope and service account permission requirement.
- The Docker Compose example mounted `./nginx.conf` into the Nginx container but never created that file. Added a short Nginx configuration snippet before writing the Compose file.
- The Docker Compose example used the obsolete top-level `version: "3.8"` field. Removed it so the example follows the current Compose Specification behavior.
- The PostgreSQL service used `POSTGRES_PASSWORD_FILE=/run/secrets/db_password` without defining or mounting a Compose secret at that path. Replaced it with `POSTGRES_PASSWORD=change-me` so the example is self-contained.

## Review Notes
- The Docker Debian installation examples use a still-valid signed keyring approach, although Docker's current documentation now shows a Deb822 `docker.sources` file with `/etc/apt/keyrings/docker.asc`.
- The idempotency examples use Docker's convenience script, which Docker documents as best suited for testing and development environments.
