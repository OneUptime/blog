# Validation Summary: EdgeDB Is Now Gel: What Must You Rename?

## Status

validated

## Post Type

Migration guide and version-aware technical reference

## Technologies Covered

- Gel and EdgeDB server versions 5 and 6 or later
- Gel and EdgeDB CLI tools
- Gel project configuration (`gel.toml` and `edgedb.toml`)
- Gel schema files and EdgeQL migrations
- JavaScript and TypeScript Gel clients, codemods, and code generation
- Python, Go, and Rust Gel clients
- Environment variables and Gel DSNs
- Docker and the official Gel container image
- GitHub Actions and `geldata/setup-gel`
- PostgreSQL backends, dump, and restore
- Gel Cloud sunset and self-hosted deployment

## Sources Consulted

- [Upgrading from EdgeDB v5 to Gel](https://docs.geldata.com/resources/upgrading)
- [EdgeDB is now Gel announcement](https://www.geldata.com/blog/edgedb-is-now-gel-and-postgres-is-the-future)
- [Gel joins Vercel and Gel Cloud shutdown announcement](https://www.geldata.com/blog/gel-joins-vercel)
- [Migrating from Gel Cloud to self-hosted Gel](https://docs.geldata.com/cloud/migrate_from)
- [Gel projects and `gel.toml` reference](https://docs.geldata.com/reference/using/projects)
- [Gel schema reference](https://docs.geldata.com/reference/datamodel)
- [Gel connection parameters and DSN reference](https://docs.geldata.com/reference/using/connection)
- [Gel server configuration and environment variables](https://docs.geldata.com/reference/running/configuration)
- [Deploying Gel with Docker](https://docs.geldata.com/reference/running/deployment/docker)
- [`gel cli upgrade` reference](https://docs.geldata.com/reference/using/cli/gel_cli_upgrade)
- [`gel instance upgrade` reference](https://docs.geldata.com/reference/using/cli/gel_instance/gel_instance_upgrade)
- [`gel project upgrade` reference](https://docs.geldata.com/reference/using/cli/gel_project/gel_project_upgrade)
- [`gel query` reference](https://docs.geldata.com/reference/using/cli/gel_query)
- [EdgeDB-to-Gel JavaScript and TypeScript migration guide](https://www.geldata.com/updates#js-ts-migration-guide-edgedb-to-gel)
- [Gel TypeScript query-builder generator reference](https://docs.geldata.com/reference/using/js/querybuilder)
- [Official `gel-js` compatibility-package manifest](https://github.com/geldata/gel-js/blob/master/edgedb/edgedb/package.json)
- [Official `gel-js` codemod package mappings](https://github.com/geldata/gel-js/blob/master/packages/codemod/scripts/package-json-update.ts)
- [Official `setup-gel` GitHub Action](https://github.com/geldata/setup-gel)
- [Official `geldata/gel` Docker image](https://hub.docker.com/r/geldata/gel)

## Issues Found

- The post presented Gel Cloud and its console as a current instance-upgrade path. Gel's later official announcement scheduled the service to shut down fully on January 31, 2026, before this post's publication date. Replaced that obsolete path with the shutdown caveat and the documented `gel instance upgrade <name> --to-version=6` path for local CLI-managed standalone instances.
- The Bash DSN example assigned `GEL_DSN` without exporting it, so a subsequently launched client would not inherit it. Changed the example to `export GEL_DSN=...`.
- The runtime-configuration paragraph could be read as delaying client variables such as `GEL_DSN` until the server upgrade. Clarified that client connection names follow the CLI/client migration, while `EDGEDB_`-to-`GEL_` server and Docker variables follow the v5-to-v6 server transition.
- `GEL_SERVER_PASSWORD` was grouped with general server settings without its lifecycle constraint. Clarified that the official Docker image consumes it only during the first initialization of an instance; `GEL_SERVER_DATADIR` and `GEL_SERVER_TLS_CERT_FILE` remain server startup settings.
- The generated-code warning described the old npm surface as creating "two compatibility layers." The current `edgedb` npm package is one deprecated compatibility wrapper around `gel`. Reworded the warning to say that mixed imports retain that wrapper in the dependency graph and obscure the import surface in use.
- The remote-upgrade checklist referred only generically to a PostgreSQL prerequisite. Made the Gel 6 requirement explicit: PostgreSQL 14 or later.
- The JavaScript/TypeScript migration-guide link pointed to the general updates page. Added the official section anchor so it opens the referenced guide directly, and added the official Gel Cloud sunset migration link.

## Review Notes

- In `gel.toml`, `server-version = "5.7"` is a minimum-version constraint within major version 5, not an exact patch pin. An exact constraint would use `server-version = "=5.7"`. The post correctly relies only on the fact that the CLI will not cross into major version 6 automatically.
- `gel project upgrade --to-latest` may select a major later than 6 when one is available. This remains consistent with the post's stated Gel 6-or-later scope; use `--to-version=6` when the target must specifically be major version 6.
- The older v5 upgrade page still contains a Gel Cloud upgrade subsection, but the later December 2025 shutdown announcement and Cloud migration guide supersede it for a post dated August 2026.
- All remaining commands, configuration snippets, package mappings, schema and migration extensions, DSN syntax, action name, Docker image name, and version-query example matched the official references consulted.
