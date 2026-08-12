# Validation Summary: Upgrade Woodpecker 2.x to 3.x Safely

## Status

validated

## Post Type

Technical migration guide

## Technologies Covered

- Woodpecker CI 2.8.3 and 3.17.0 server, agent, and CLI
- Woodpecker YAML workflows, secrets, filters, and built-in variables
- Cron expressions and IANA time zones
- Forge OAuth integrations, repository webhooks, and RFC 9421 HTTP message signatures
- Docker Compose, Docker agents, Kubernetes agents, and the Docker Buildx plugin
- SQLite, PostgreSQL, MySQL, and MariaDB backup and restore workflows

## Sources Consulted

- [Woodpecker 3.0 migration notes](https://woodpecker-ci.org/migrations#300)
- [Woodpecker 3.17.0 release](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.17.0) and [Woodpecker 2.8.3 release](https://github.com/woodpecker-ci/woodpecker/releases/tag/v2.8.3)
- Woodpecker documentation for [server configuration](https://woodpecker-ci.org/docs/administration/configuration/server), [workflow syntax](https://woodpecker-ci.org/docs/usage/workflow-syntax), [secrets](https://woodpecker-ci.org/docs/usage/secrets), [cron jobs](https://woodpecker-ci.org/docs/usage/cron), [CLI commands](https://woodpecker-ci.org/docs/cli), [project settings](https://woodpecker-ci.org/docs/usage/project-settings), and [container images](https://woodpecker-ci.org/docs/administration/general#container-images)
- Tagged workflow sources: [2.8.3 legacy-secret compilation](https://github.com/woodpecker-ci/woodpecker/blob/v2.8.3/pipeline/frontend/yaml/compiler/convert.go#L128-L142), [3.17.0 workflow schema](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/frontend/yaml/linter/schema/schema.json), [3.17.0 schema-lint behavior](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/frontend/yaml/linter/linter.go#L296-L309), and [3.17.0 legacy-key parsing test](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/frontend/yaml/parse_test.go#L168-L207)
- Tagged secret-service sources: [3.17.0 native-secret precedence](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/services/secret/db.go) and [3.17.0 secret-store setup](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/services/setup.go)
- Tagged gRPC sources: [2.8.3 default](https://github.com/woodpecker-ci/woodpecker/blob/v2.8.3/cmd/server/flags.go#L92-L99), [3.17.0 configuration](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cmd/server/flags.go#L125-L136), and [3.17.0 temporary-secret generation](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cmd/server/grpc_server.go#L34-L43)
- Tagged health-route sources: [host-path setup](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/cmd/server/setup.go#L245-L264) and [router registration](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/router/router.go#L54-L70)
- Tagged cron sources: [3.17.0 cron model](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/model/cron.go#L24-L68), [schedule migration](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/store/datastore/migration/011_cron_without_sec.go#L27-L53), and [cron scheduler](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/server/cron/cron.go#L40-L116)
- Tagged image sources: [3.17.0 scratch server Dockerfile](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/docker/Dockerfile.server.multiarch.rootless), [3.17.0 Alpine server Dockerfile](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/docker/Dockerfile.server.alpine.multiarch.rootless), and the official [Docker Buildx plugin tags](https://hub.docker.com/r/woodpeckerci/plugin-docker-buildx/tags)
- [Woodpecker issue #6688: non-UTC cron zones require tzdata](https://github.com/woodpecker-ci/woodpecker/issues/6688) and [Go time-zone database documentation](https://go.dev/doc/go1.15#time/tzdata)
- [RFC 9421: HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421.html)
- Vendor backup documentation: [SQLite Online Backup API](https://www.sqlite.org/backup.html), [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html), [MySQL backup and recovery](https://dev.mysql.com/doc/refman/8.4/en/backup-and-recovery.html), and [MariaDB backup and restore](https://mariadb.com/docs/server/server-usage/backup-and-restore/backup-and-restore-overview)

## Issues Found

- The scan guidance said `include` and `exclude` remained valid everywhere outside `when.event`. In 3.17, `when.status` is also allowlist-only. The wording now identifies that exception while retaining the valid warning that matches elsewhere require review.
- The legacy-secret explanation described `secrets:` as step-only. Woodpecker 2.8.3 also accepted that injection key on services. The text and subsection heading now describe removal of the YAML key across workflow containers.
- The post said former top-level `pipeline:`, `platform:`, and `branches:` keys always produce errors. Although the schema reports violations, 3.17.0 marks those diagnostics as warnings and ignores the legacy values; only a separate blocking problem, such as having no valid `steps`, necessarily stops the pipeline. The text now describes the actual runtime risk.
- The deployment inventory did not explain the gRPC-secret default change. Woodpecker 2.8.3 used the implicit literal `secret`, while 3.17.0 generates a non-persistent random value when the setting is absent. The post now directs operators to generate and persist a secure value and share it across HA replicas.
- The cutover checklist assumed the health route was always `/healthz`. Woodpecker registers it beneath the path in `WOODPECKER_HOST`. The check now uses the configured base path and gives both root and subpath examples.
- The cron section implied that non-UTC IANA zones work in the pinned official images without additional setup. The official 3.17.0 scratch and Alpine server images do not contain zoneinfo. The post now requires mounting zoneinfo or using a derived image containing `tzdata` before assigning a non-UTC zone.
- The CLI migration covered the `cron` to `repo cron` command-group move but omitted the `info` to `show` subcommand rename. The old and new full command paths are now stated explicitly.

## Review Notes

- The post's external links resolve to the intended official documentation and release pages.
- The remaining YAML, shell, Docker Compose, secret-precedence, cron-migration, privileged-plugin, webhook-repair, backup, and rollback claims were checked against the tagged 2.8.3 and 3.17.0 source or authoritative documentation.
- The workflow parser, compiler, linter, schema, constraint, matrix, and YAML type test suites passed for both tagged versions with `go test ./pipeline/frontend/yaml/...`.
- Woodpecker 3.17.0 was the current stable release on 2026-08-12. The zoneinfo packaging caveat is version-specific and should be rechecked when changing the target release.
