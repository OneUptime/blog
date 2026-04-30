# Validation Summary: How to Configure GCP Private Google Access with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Platform (GCP)
- Private Google Access
- VPC networking
- Cloud DNS
- Compute Engine
- OpenTofu / Terraform HCL

## Sources Consulted
- Google Cloud: Configure Private Google Access — https://docs.cloud.google.com/vpc/docs/configure-private-google-access
- Google Cloud: Private Google Access with VPC Service Controls — https://docs.cloud.google.com/vpc-service-controls/docs/private-connectivity
- Google Cloud: Operating system details for Compute Engine images — https://docs.cloud.google.com/compute/docs/images/os-details
- Google Cloud SDK: `gcloud storage ls` reference — https://cloud.google.com/sdk/gcloud/reference/storage/ls
- HashiCorp Google provider docs source: `google_compute_subnetwork` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_subnetwork.html.markdown
- HashiCorp Google provider docs source: `google_compute_instance` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_instance.html.markdown
- HashiCorp Google provider docs source: `google_compute_route` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_route.html.markdown
- HashiCorp Google provider docs source: `google_dns_managed_zone` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/dns_managed_zone.html.markdown
- HashiCorp Google provider docs source: `google_dns_record_set` — https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/dns_record_set.html.markdown

## Issues Found
- The description and overview incorrectly implied that Private Google Access uses only internal IPs. I corrected this to state that VMs without external IPs can still reach Google APIs, and that traffic remains on Google's network.
- Step 3 implied that custom DNS and route entries are always required. Google documents them as optional when you choose `private.googleapis.com` or `restricted.googleapis.com`; if the VPC still has the default route to the default internet gateway, that route can be used instead.
- The Step 3 route used the wrong IPv4 range for `restricted.googleapis.com`. I corrected it from `199.36.153.8/30` to `199.36.153.4/30`.
- The Step 3 DNS example was incomplete. Google requires an `A` record for `restricted.googleapis.com` plus the wildcard `CNAME`; I added the missing `A` record.
- Step 4 had the `private.googleapis.com` and `restricted.googleapis.com` IPv4 ranges effectively swapped by label/comment. I corrected the alternative `private.googleapis.com` route to `199.36.153.8/30`.
- The VM example overclaimed that the `gcloud storage ls` command would always work. I clarified that it still depends on the attached service account having permission to access the bucket.

## Review Notes
- `private_ipv6_google_access` is a valid provider field, but it is only relevant for IPv6-related scenarios; the post remains primarily an IPv4 Private Google Access example.
- Debian 12 Compute Engine images currently include the `gcloud` CLI, so the example command remains valid on that image family.
