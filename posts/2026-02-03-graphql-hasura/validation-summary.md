# Validation Summary: How to Build GraphQL APIs with Hasura

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Hasura GraphQL Engine (v2.36.0)
- GraphQL (queries, mutations, subscriptions)
- PostgreSQL
- Docker Compose
- Kubernetes / Helm
- Hasura CLI (migrations, metadata)
- JWT authentication
- Node.js / Express (action and event trigger handlers)
- bcrypt
- GitHub Actions (CI/CD)

## Sources Consulted
- Hasura v2.36.0 changelog: https://hasura.io/changelog/enterprise-edition/v2.36.0
- Hasura Docker Hub: https://hub.docker.com/r/hasura/graphql-engine
- Hasura Helm Charts repo: https://github.com/hasura/helm-charts/tree/main/charts/graphql-engine
- Hasura CLI docs (`hasura migrate create`): https://hasura.io/docs/2.0/hasura-cli/commands/hasura_migrate_create/
- Hasura "Connect a database" quickstart: https://hasura.io/docs/2.0/databases/quickstart/
- Hasura caching docs: https://hasura.io/docs/2.0/caching/caching-config/ and https://hasura.io/docs/2.0/caching/quickstart/
- Hasura JWT auth docs: https://hasura.io/docs/2.0/auth/authentication/jwt/
- Hasura permissions / session variables docs: https://hasura.io/docs/2.0/auth/authorization/

## Issues Found
1. **Hasura Helm chart admin-secret value name was incorrect.**
   - The post used `--set adminSecret=myadminsecret`, but the official `hasura/graphql-engine` Helm chart exposes it as `secret.adminSecret`.
   - Changed to `--set secret.adminSecret=myadminsecret` so the command actually sets the admin secret.

## Review Notes
- The `@cached(ttl: 60)` directive is correct. Worth knowing for readers: in Hasura Cloud, `ttl` is capped at 300 seconds, so very large values will be clamped — not an error in the post, just a caveat.
- The `hasura/graphql-engine:v2.36.0` tag is real (v2.36.0 released Dec 12, 2023). Hasura v3 / DDN is now a separate product line; this post is squarely focused on the v2 self-hosted GraphQL Engine, which remains supported and widely deployed.
- The `version: '3.6'` Docker Compose key is valid but Compose now ignores the `version` field for newer Compose CLI versions — harmless, kept as-is to match the user's likely existing files.
- Console navigation ("Data > Manage > Connect Database") is accurate for Hasura v2; the v3 / DDN console differs significantly if a reader is on that product.
- The Hasura CLI install via `brew install hasura-cli` and the `curl | bash` script for Linux are the official documented install methods.
- The JWT claims namespace (`https://hasura.io/jwt/claims`) and the `x-hasura-*` claim names are correct.
- All GraphQL operation naming (`insert_users_one`, `update_users`, `delete_users_by_pk`, `_or`, `_eq`, etc.) matches Hasura's auto-generated schema conventions.
- The event trigger payload structure (`event.data.new`) and retry config keys (`num_retries`, `retry_interval_seconds`, `timeout_seconds`) match Hasura's documented contract.
