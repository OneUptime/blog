# Validation Summary: How to Create DigitalOcean Container Registry with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible)
- DigitalOcean Terraform provider
- DigitalOcean Container Registry (DOCR)
- DigitalOcean Kubernetes (DOKS)
- DigitalOcean App Platform
- Docker / `doctl` CLI

## Sources Consulted
- DigitalOcean Terraform provider — `digitalocean_container_registry`: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/container_registry.md
- DigitalOcean Terraform provider — `digitalocean_container_registry_docker_credentials`: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/container_registry_docker_credentials.md
- DigitalOcean Terraform provider — `digitalocean_app`: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/app.md
- DigitalOcean Terraform provider — `digitalocean_kubernetes_cluster`: https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/kubernetes_cluster.md
- DOCR pricing: https://docs.digitalocean.com/products/container-registry/details/pricing/
- DOCR garbage collection: https://docs.digitalocean.com/products/container-registry/how-to/clean-up-container-registry/

## Issues Found
1. **Section heading "Configuring Garbage Collection" was incorrect.** The code under that heading was actually the Docker credentials resource, not garbage collection. The DigitalOcean Terraform provider does not expose a garbage collection resource — DOCR garbage collection is run via the API/control panel/`doctl`, not Terraform. Renamed the heading to "Generating Docker Credentials" to match the code beneath it.
2. **App Platform `image` block incorrectly set `registry` for DOCR.** The provider docs explicitly state that `registry` "must be left empty for the `DOCR` registry type" (it is only used for `DOCKER_HUB`). Removed the `registry = digitalocean_container_registry.main.name` line and added a short comment explaining why.
3. **Storage units in the pricing table.** Official DOCR pricing is documented in binary units (MiB / GiB), not MB / GB. Updated the table to match the official pricing page (500 MiB / 5 GiB / 100 GiB).

## Review Notes
- The `digitalocean_kubernetes_cluster` example hardcodes version `1.32.2-do.0`. The format is plausible and matches the documented `<k8s-version>-do.<revision>` pattern, but DigitalOcean rotates exact patch revisions. Best practice (per the provider docs) is to look up the current slug via the `digitalocean_kubernetes_versions` data source rather than hardcoding. Left as-is since the post is illustrative.
- `var.image_tag` is referenced in the App Platform example but not declared. Acceptable for an illustrative snippet.
- The `digitalocean_container_registry_docker_credentials` resource also accepts an optional `expiry_seconds` argument that is not shown — fine to omit for a basic example.
- The `digitalocean_app` `image` block also supports `deploy_on_push { enabled = true }` for DOCR auto-deploys; not required, just a useful addition for future expansion.
