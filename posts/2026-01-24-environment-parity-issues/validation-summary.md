# Validation Summary: How to Fix 'Environment Parity' Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Docker Compose
- Node.js and npm
- Terraform
- Kubernetes
- Argo CD hooks
- TypeScript
- js-yaml
- Knex migrations
- PostgreSQL
- Redis
- Bash
- kubectl
- jq
- Twelve-Factor App methodology

## Sources Consulted
- Twelve-Factor App: Dev/prod parity: https://12factor.net/dev-prod-parity
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Compose Specification, version top-level element: https://github.com/compose-spec/compose-spec/blob/main/spec.md#version-top-level-element-obsolete
- Node.js Docker image best practices: https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md
- npm ci documentation: https://docs.npmjs.com/cli/v10/commands/npm-ci/
- npm prune documentation: https://docs.npmjs.com/cli/v10/commands/npm-prune/
- Terraform Kubernetes provider deployment resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- Kubernetes object names and DNS subdomain rules: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Knex schema builder documentation: https://knexjs.org/guide/schema-builder.html

## Issues Found
- The Dockerfile installed only production dependencies before running `npm run build`, which commonly fails when build tools are in `devDependencies`. Changed it to run `npm ci`, build, then prune development dependencies with `npm prune --omit=dev`.
- The Terraform example was marked as YAML even though it was HCL. Changed the code fence language to `hcl`.
- The Terraform deployment referenced `var.app_version` without declaring it. Added the missing `app_version` variable.
- The dev Terraform variables used `app_version = "latest"`, contradicting the post's pinned-version guidance. Changed it to the same pinned `v2.3.1` tag used by staging and production.
- The config loader defaulted to `development`, but the example file was named `dev.yaml`. Changed the default and Compose `NODE_ENV` value to `dev`.
- The config loader called `deepMerge` without defining it. Added a small recursive merge helper.
- The Docker Compose example used the obsolete top-level `version` field. Removed it.
- The Docker Compose example mounted `./src` for hot reload while the Dockerfile runs the built `dist/server.js`. Removed the misleading volume from the production-like Compose example.
- The Kubernetes Job manifest used shell-style `${VERSION}` placeholders in fields Kubernetes would not expand directly, including an invalid object name. Replaced them with a concrete valid name and image tag.
- The TypeScript test snippet used `fs`, `loadYaml`, `getNestedKeys`, and `getMigrationsForEnv` without defining or importing them. Added the missing imports and helper functions.
- The parity-check script looked up `app-config` ConfigMaps, but the Terraform example names them `app-config-${var.environment}`. Updated the script to use `app-config-dev`, `app-config-staging`, and `app-config-production`.
- The parity-check script only compared dev and staging image tags. Added production to the image comparison.

## Review Notes
The examples are still illustrative and assume project-specific scripts such as `npm run migrate` and `npm run migrate:status` exist. The overall guidance is technically sound: keep environment differences intentional, use pinned versions and lockfiles, define infrastructure declaratively, and verify parity continuously.
