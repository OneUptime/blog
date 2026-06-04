# Validation Summary: How to Run Payload CMS in Docker

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Payload CMS
- Docker
- Docker Compose
- PostgreSQL
- Next.js
- TypeScript
- Node.js
- Traefik

## Sources Consulted
- Payload installation documentation: https://payloadcms.com/docs/getting-started/installation
- Payload configuration documentation: https://payloadcms.com/docs/configuration/overview
- Payload collections documentation: https://payloadcms.com/docs/configuration/collections
- Payload database documentation: https://payloadcms.com/docs/database/overview
- Payload migrations documentation: https://payloadcms.com/docs/database/migrations
- Payload REST API documentation: https://payloadcms.com/docs/rest-api/overview
- Payload Local API documentation: https://payloadcms.com/docs/local-api/overview
- Payload hooks documentation: https://payloadcms.com/docs/hooks/overview
- Payload Lexical rich text documentation: https://payloadcms.com/docs/rich-text/lexical
- Next.js standalone output documentation: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- PostgreSQL Docker image documentation: https://hub.docker.com/_/postgres
- Traefik Docker provider documentation: https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/

## Issues Found
- The prerequisites listed Node.js 18+, but current Payload documentation requires Node.js 20.9.0 or newer. Updated the prerequisite to Node.js 20.9+.
- The database support bullet listed only MongoDB and PostgreSQL. Payload officially supports MongoDB, PostgreSQL, and SQLite adapters. Updated the bullet to include SQLite.
- The sample `payload.config.ts` registered only the `Articles` collection, but the `Articles` collection references `users` and `media`. Added imports for `Users` and `Media`, and registered them before `Articles`.
- The Docker Compose example used the obsolete top-level `version` field. Removed it so the file follows the current Compose Specification.
- The REST API create example used an incomplete Lexical rich text value. Replaced it with a valid minimal Lexical editor state shape.

## Review Notes
- For PostgreSQL production deployments, Payload requires a migration workflow for schema changes. The article's Docker setup is usable as a high-level deployment guide, but a future revision should add an explicit migration step or `prodMigrations` startup configuration.
