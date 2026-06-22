# Validation Summary: How to Use Docker with Pulumi

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Pulumi CLI and Pulumi projects
- Pulumi Docker provider
- Docker containers, images, networks, and volumes
- TypeScript, Python, and Go Pulumi SDKs
- Pulumi ComponentResource
- Pulumi StackReference
- Pulumi unit testing mocks
- GitHub Actions with Pulumi

## Sources Consulted
- Pulumi Docker provider overview: https://www.pulumi.com/registry/packages/docker/
- Pulumi Docker provider installation: https://www.pulumi.com/registry/packages/docker/installation-configuration/
- Pulumi Docker provider GitHub README: https://github.com/pulumi/pulumi-docker
- Pulumi docker.Container API docs: https://www.pulumi.com/registry/packages/docker/api-docs/container/
- Pulumi docker.Image API docs: https://www.pulumi.com/registry/packages/docker/api-docs/image/
- Pulumi Docker Build provider docs: https://www.pulumi.com/registry/packages/docker-build/api-docs/image/
- Pulumi templates repository: https://github.com/pulumi/templates
- Pulumi install docs: https://www.pulumi.com/docs/install/
- Pulumi GitHub Actions docs: https://www.pulumi.com/docs/iac/operations/continuous-delivery/github-actions/
- Pulumi Actions GitHub README: https://github.com/pulumi/actions

## Issues Found
- The project creation commands used `pulumi new docker-typescript`, `docker-python`, and `docker-go`, but those are not listed in the official Pulumi templates repository. Changed them to the standard `typescript`, `python`, and `go` templates and added the official Docker provider package installation commands for each language.
- The TypeScript configuration example interpolated `config.requireSecret("databaseUrl")` into a normal JavaScript template string. Since Pulumi secrets are `Output` values, changed it to `pulumi.interpolate`.
- The TypeScript image-building example used `config` without declaring or importing it. Added the Pulumi import and `new pulumi.Config()` initialization.
- The Python PostgreSQL example interpolated `db_password`, a Pulumi secret `Output`, with an f-string. Changed it to `db_password.apply(...)` so the secret value is handled as an output.
- The TypeScript unit test referenced `infra.container.image`, but the earlier TypeScript example did not export `container`. Added an export for the container resource.
- The CI/CD example used `pulumi/actions@v4`, while the current official Pulumi Actions README and docs use `pulumi/actions@v7`. Updated both workflow steps to `v7`.
- The reusable component labeled an unconfigured nginx container as a load balancer. Changed the comment to "Public nginx container" to avoid implying it proxies traffic to the replicas.

## Review Notes
- The `docker.Image` resource is still documented, but Pulumi currently recommends the newer Docker Build provider for image builds. The existing example remains technically valid for the Docker provider, but future revisions could show `@pulumi/docker-build` for image-building-focused workflows.
