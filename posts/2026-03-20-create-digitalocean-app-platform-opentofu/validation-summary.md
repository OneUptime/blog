# Validation Summary: How to Create DigitalOcean App Platform Apps with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- DigitalOcean App Platform (PaaS)
- DigitalOcean Terraform provider (`digitalocean_app` resource)
- DigitalOcean Container Registry (DOCR)
- DigitalOcean Managed Databases (PostgreSQL)
- Git-based and container-image-based deployments

## Sources Consulted
- [DigitalOcean Terraform provider — `digitalocean_app` resource docs (GitHub source)](https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/app.md)
- [DigitalOcean Terraform reference — `digitalocean_app`](https://docs.digitalocean.com/reference/terraform/reference/resources/app/)
- [DigitalOcean App Platform — How to Use Environment Variables (bindable variables)](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/)
- [DigitalOcean App Platform — How to Manage Databases](https://docs.digitalocean.com/products/app-platform/how-to/manage-databases/)

## Issues Found

1. **Container Registry example used `registry = "myorg"` with `registry_type = "DOCR"`.**
   The DigitalOcean provider documentation explicitly states the `registry` field must be left empty for the `DOCR` registry type — the registry is implicit from the account context, and the `repository` field already identifies the image. The post's value would either be ignored or rejected by the API.
   *Fix:* Removed the `registry` line and updated the comment to note that it must be empty for DOCR.

2. **Database environment variable used the wrong binding syntax.**
   The post had `value = "${DATABASE_URL}"` with a comment claiming "App Platform injects this automatically." Two technical problems:
   - App Platform does **not** automatically inject `DATABASE_URL` for bound databases — you must explicitly define an env var whose value is a *bindable variable* of the form `${component_name.DATABASE_URL}`. With the database component named `db`, the correct reference is `${db.DATABASE_URL}`.
   - Inside an HCL string, `${...}` is Terraform interpolation. To pass the literal `${db.DATABASE_URL}` through to App Platform (so App Platform can resolve it at runtime), the `$` must be escaped as `$$`, giving `"$${db.DATABASE_URL}"`.
   *Fix:* Changed the value to `"$${db.DATABASE_URL}"` and rewrote the comment to explain the bindable-variable mechanism and the `$$` escape.

## Review Notes
- The `instance_size_slug` values used in the post (`apps-s-1vcpu-0.5gb`, `apps-s-1vcpu-1gb`) are valid current App Platform slugs. The provider's default is `basic-xxs`; both slug families are accepted by the API. The current authoritative list is best obtained via `doctl apps tier instance-size list`.
- For `production = true` databases, the `cluster_name` field binds to an *existing* DigitalOcean managed-database cluster — it does not provision one. The post's comment "Provision a managed PostgreSQL database as part of the app" is slightly imprecise (a separate `digitalocean_database_cluster` would be needed to create the cluster, or `production = false` would create a dev DB inline), but the example as written is technically valid for the documented behavior.
- The `digitalocean_app` resource's `live_url` exported attribute used in the final example is correct.
- The DigitalOcean App Platform API also supports `GHCR` and `GITLAB` `registry_type` values; the Terraform provider docs primarily highlight `DOCR` and `DOCKER_HUB`, but DOCR (used in the post) is correct and well-supported.
- The worker example's inner `service` block is intentionally abbreviated with a `# ... web service config` placeholder — readers should know it would be incomplete on its own.
