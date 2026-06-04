# Validation Summary: How to Run Docker Containers on DigitalOcean App Platform

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- DigitalOcean App Platform
- Docker and Dockerfiles
- DigitalOcean Container Registry
- Docker Hub
- GitHub Container Registry
- doctl CLI
- App Platform app specs
- App Platform databases, domains, health checks, autoscaling, logs, and rollbacks

## Sources Consulted
- DigitalOcean App Platform documentation: https://docs.digitalocean.com/products/app-platform/
- DigitalOcean App Platform app spec reference: https://docs.digitalocean.com/products/app-platform/reference/app-spec/
- DigitalOcean Dockerfile build reference: https://docs.digitalocean.com/products/app-platform/reference/dockerfile/
- DigitalOcean deploy from container images guide: https://docs.digitalocean.com/products/app-platform/how-to/deploy-from-container-images/
- DigitalOcean doctl apps command reference: https://docs.digitalocean.com/reference/doctl/reference/apps/
- DigitalOcean doctl apps update reference: https://docs.digitalocean.com/reference/doctl/reference/apps/update/
- DigitalOcean doctl apps logs reference: https://docs.digitalocean.com/reference/doctl/reference/apps/logs/
- DigitalOcean doctl apps create-deployment reference: https://docs.digitalocean.com/reference/doctl/reference/apps/create-deployment/
- DigitalOcean App Platform database management guide: https://docs.digitalocean.com/products/app-platform/how-to/manage-databases/
- DigitalOcean App Platform environment variables guide: https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/
- DigitalOcean App Platform health checks guide: https://docs.digitalocean.com/products/app-platform/how-to/manage-health-checks/
- DigitalOcean App Platform deployments and rollback guide: https://docs.digitalocean.com/products/app-platform/how-to/manage-deployments/
- DigitalOcean App Platform scaling guide: https://docs.digitalocean.com/products/app-platform/how-to/scale-app/
- DigitalOcean App Platform pricing / instance sizes: https://docs.digitalocean.com/products/app-platform/details/pricing/
- DigitalOcean Valkey documentation: https://docs.digitalocean.com/products/databases/valkey/

## Issues Found
- The post said App Platform supports three container deployment options. Current documentation also lists GitHub Container Registry, so the deployment options list was updated.
- Several app spec examples used deprecated `routes`. Replaced those examples with top-level `ingress.rules` routing.
- Database examples used unsupported `size` and `num_nodes` fields for App Platform databases. Removed those fields and used documented database spec fields.
- The multi-service example used Redis as an App Platform database without a valid current managed database shape. Updated it to Valkey with a managed cluster reference.
- The scheduled job example used `kind: PRE_DEPLOY`, which is a deployment job rather than a scheduled job. Changed it to `kind: SCHEDULED` with a cron schedule.
- The post used `doctl apps config set`, which is not in the current doctl apps command reference. Replaced it with documented spec update and spec validation commands.
- The post used old component size slugs and an outdated `professional-xl` memory description. Replaced `basic-xs` with current size slugs and corrected `professional-xl` to 16 GiB RAM.
- The autoscaling section said autoscaling is available on Professional plans. Updated it to state that CPU-based autoscaling requires a dedicated CPU instance size.
- The rollback CLI example used `doctl apps create-deployment`, which redeploys rather than rolls back. Replaced it with the documented rollback API request and clarified the control panel limit of ten recent successful deployments.

## Review Notes
The post is now technically aligned with current DigitalOcean App Platform documentation. Future improvements could mention GHCR in its own deployment section and recommend image digests for immutable production deployments, but those are optional enhancements rather than correctness fixes.
