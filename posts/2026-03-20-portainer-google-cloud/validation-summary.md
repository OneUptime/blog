# Validation Summary: How to Deploy Portainer on Google Cloud Compute Engine - Part 2

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer CE
- Google Cloud Compute Engine
- Google Cloud VPC firewall rules
- Google Cloud static external IP addresses
- Google Cloud DNS
- Docker
- Ubuntu 22.04 LTS
- `gcloud` CLI

## Sources Consulted
- Google Cloud SDK reference: `gcloud compute instances create` - https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK reference: `gcloud compute firewall-rules create` - https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud SDK reference: `gcloud compute instances add-access-config` - https://cloud.google.com/sdk/gcloud/reference/compute/instances/add-access-config
- Google Cloud SDK reference: `gcloud compute instances delete-access-config` - https://cloud.google.com/sdk/gcloud/reference/compute/instances/delete-access-config
- Google Cloud SDK reference: `gcloud compute addresses create` - https://cloud.google.com/sdk/gcloud/reference/compute/addresses/create
- Cloud DNS managed zones documentation - https://cloud.google.com/dns/docs/zones
- Google Cloud SDK reference: `gcloud dns managed-zones create` - https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/create
- Google Cloud SDK reference: `gcloud dns record-sets create` - https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- Compute Engine machine families documentation - https://cloud.google.com/compute/docs/general-purpose-machines
- Compute Engine pricing page - https://cloud.google.com/compute/all-pricing
- Docker Engine install on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Portainer CE install with Docker on Linux - https://docs.portainer.io/start/install-ce/server/docker/linux

## Issues Found
- The VM creation command had an inline comment after a trailing backslash, which breaks shell parsing. I moved the `e2-medium` note onto its own comment line so the command is valid Bash.
- The firewall section exposed port `9000` as if it were the main Portainer HTTP port, but the post's own `docker run` command published `8000` and `9443`, and Portainer's current docs treat `9000` as a legacy optional port. I changed the secondary firewall example to `8000` and clarified that `9000` is only needed for legacy HTTP access.
- The static IP reassignment step used `--access-config-name="External NAT"`, while the current `gcloud` CLI documents `external-nat` as the default access config name. I removed the flag so the documented default is used safely.
- The Docker install command ran Docker's convenience script without `sudo`, which would fail in a normal `gcloud compute ssh` session. I changed it to the documented `get-docker.sh` flow with `sudo sh`.
- The Portainer container image used `portainer/portainer-ce:latest`, while Portainer's current install docs use the stable `portainer/portainer-ce:sts` tag. I updated both the interactive install and startup script examples.
- The Cloud DNS zone was created for `portainer.yourdomain.com.`, which makes the example depend on subdomain delegation and is not the typical zone layout for creating a host record. I changed the managed zone suffix to `yourdomain.com.` while keeping the `portainer.yourdomain.com.` A record.
- The E2 machine specs and monthly estimates were inaccurate. I corrected the vCPU counts to Google's current E2 shared-core values and updated the approximate on-demand monthly costs for `us-central1`, while also noting that disk and network egress are excluded.

## Review Notes
- Docker's Ubuntu docs allow the `get.docker.com` convenience script, but explicitly position it as better suited to testing and development than production. The post remains technically correct after the fixes, but an `apt` repository install would be a stronger production recommendation in a future revision.
- Portainer uses `9443` by default with a self-signed certificate. Port `9000` is only needed for legacy HTTP access.
- Command syntax was verified against current official documentation; the commands were not executed in this workspace because the Google Cloud CLI is not installed here.
