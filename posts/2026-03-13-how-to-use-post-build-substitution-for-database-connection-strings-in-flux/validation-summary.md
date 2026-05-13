# Validation Summary: How to Use Post-Build Substitution for Database Connection Strings in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization post-build substitution
- Flux CLI
- Kubernetes Secrets
- Kubernetes Deployments and environment variables
- Database connection URIs for PostgreSQL, MongoDB, Redis, and MySQL

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- RFC 3986 URI Generic Syntax: https://www.rfc-editor.org/rfc/rfc3986.html
- PostgreSQL libpq connection URI documentation: https://www.postgresql.org/docs/16/libpq-connect.html
- MongoDB connection string documentation: https://www.mongodb.com/docs/manual/reference/connection-string/

## Issues Found
- Connection string examples inserted raw passwords containing `@` into URI userinfo fields. This can break URI parsing because `@` delimits userinfo from the host. Updated the examples to use percent-encoded password variables and percent-encoded values in pre-constructed connection strings.
- The generated Kubernetes Secret used keys named `database-url` and `redis-url` and then imported them with `envFrom`. Secret keys with hyphens are valid Secret keys, but they are not valid environment variable names for container environment injection. Updated the keys to `DATABASE_URL` and `REDIS_URL`, and updated the verification command accordingly.

## Review Notes
- The Flux `postBuild.substitute` and `substituteFrom` field names, precedence behavior, default-value syntax, and Secret substitution through `stringData` match the current Flux documentation.
- The `substituteFrom` Secrets are correctly shown in the same namespace as the Flux Kustomization.
- The post correctly quotes numeric substitution values such as `REPLICAS`, which avoids YAML type issues during substitution.
