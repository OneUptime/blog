# Validation Summary: How to Configure GCP VM Metadata and Startup Scripts with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Compute Engine
- VM metadata
- Linux startup scripts
- Linux shutdown scripts
- Cloud Storage
- OpenTofu
- HashiCorp Google provider

## Sources Consulted
- Google Cloud: About startup scripts — https://cloud.google.com/compute/docs/instances/startup-scripts
- Google Cloud: Use startup scripts on Linux VMs — https://cloud.google.com/compute/docs/instances/startup-scripts/linux
- Google Cloud: View and query VM metadata — https://cloud.google.com/compute/docs/metadata/querying-metadata
- Google Cloud: Predefined metadata keys — https://cloud.google.com/compute/docs/metadata/predefined-metadata-keys
- Google Cloud: Viewing serial port output — https://cloud.google.com/compute/docs/troubleshooting/viewing-serial-port-output
- Google Cloud: Private Google Access — https://cloud.google.com/vpc/docs/private-google-access
- Google Cloud: About SSH connections — https://cloud.google.com/compute/docs/instances/ssh
- Google Cloud: Add SSH keys to VMs — https://cloud.google.com/compute/docs/connect/add-ssh-keys
- OpenTofu: `file` function — https://opentofu.org/docs/language/functions/file/
- OpenTofu: `pathexpand` function — https://opentofu.org/docs/language/functions/pathexpand/
- Google provider docs: `google_compute_instance` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_instance.html.markdown
- Google provider docs: `google_compute_project_metadata` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_project_metadata.html.markdown
- Google provider docs: `google_sql_database_instance` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/sql_database_instance.html.markdown

## Issues Found
- The Step 3 `startup-script-url` value was hard-coded to `gs://my-scripts-bucket/...` while the uploaded object used `google_storage_bucket.scripts_bucket.name`. I changed the metadata value to reference the actual bucket and object resources so the URI matches the uploaded script.
- The Step 3 Cloud Storage example did not grant the VM service account permission to read the script object. I added a `google_storage_bucket_iam_member` resource with `roles/storage.objectViewer` and made the VM depend on that binding and the uploaded object so the example works reliably on first boot.
- The Step 3 Cloud Storage example attached the VM only to an internal IP address. A VM without an external IP needs Private Google Access to reach Cloud Storage, so I added `access_config {}` to make the example self-contained and able to fetch the script without additional subnet configuration.
- The Step 3 VM used the broad `cloud-platform` scope even though the example only needs to read a startup script from Cloud Storage. I narrowed that to `storage-ro`, which matches the documented pattern for Cloud Storage-hosted startup scripts.
- The Step 4 project metadata used `serial-port-logging`, but the documented metadata key is `serial-port-logging-enable`. I corrected the key name.
- The Step 4 example enabled OS Login while also configuring metadata-based `ssh-keys`. Compute Engine ignores metadata-based SSH keys when OS Login is enabled. I changed the example to disable OS Login in that snippet and clarified the SSH key comment so the example is internally consistent.
- The Step 4 SSH key example used `file("~/.ssh/id_rsa.pub")`, but OpenTofu does not expand `~` in `file()` paths automatically. I changed it to `file(pathexpand("~/.ssh/id_rsa.pub"))`.

## Review Notes
- `google_compute_project_metadata` authoritatively manages all project-level metadata, not just the keys shown in the snippet. On an existing project, unset keys can be removed unless you use `google_compute_project_metadata_item` instead.
- Google Cloud documents `startup-script` for scripts up to 256 KB and `startup-script-url` for Cloud Storage-hosted scripts, especially larger ones.
- If you intentionally want a VM without an external IP, the Cloud Storage example can also work by enabling Private Google Access on the subnet instead of adding `access_config {}`.
