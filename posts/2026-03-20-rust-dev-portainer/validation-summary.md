# Validation Summary: How to Set Up a Rust Development Environment with Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Rust
- Cargo
- Docker and Dockerfile
- Docker Compose / Portainer stacks
- cargo-watch
- sccache
- SQLx and sqlx-cli
- Axum
- Tokio
- PostgreSQL
- Redis
- cargo-tarpaulin
- cargo-audit
- cargo-outdated
- Distroless container images

## Sources Consulted
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services and `depends_on`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Official Rust image: https://hub.docker.com/_/rust/
- Cargo `install` command reference: https://doc.rust-lang.org/stable/cargo/commands/cargo-install.html
- Axum docs: https://docs.rs/axum/latest/axum/
- SQLx migration macro docs: https://docs.rs/sqlx/latest/sqlx/macro.migrate.html
- SQLx CLI README: https://github.com/launchbadge/sqlx/tree/main/sqlx-cli
- cargo-watch README: https://github.com/watchexec/cargo-watch
- sccache README and Rust usage docs: https://github.com/mozilla/sccache
- cargo-tarpaulin Docker usage notes: https://hub.docker.com/r/xd009642/tarpaulin
- PostgreSQL `pg_isready` docs: https://www.postgresql.org/docs/current/app-pg-isready.html
- Redis `PING` command docs: https://redis.io/docs/latest/commands/ping/
- Distroless image docs: https://github.com/GoogleContainerTools/distroless
- Portainer stack docs: https://docs.portainer.io/sts/user/docker/stacks/add
- Local `cargo info` metadata for current crate MSRVs and versions: `cargo-audit`, `cargo-outdated`, `diesel_cli`, `sea-orm-cli`, `sccache`, `sqlx-cli`, `axum`, `sqlx`, `redis`, and `tower-http`

## Issues Found
- The Dockerfiles pinned Rust 1.76, but current unpinned tools installed by the Dockerfile require newer Rust versions, including cargo-outdated requiring Rust 1.88 and several other tools requiring Rust 1.85 or newer. Updated the development and production builder images to the current Rust 1.x bookworm tags.
- The `cargo install` command mixed `--no-default-features --features postgres` into a multi-crate install and did not install `sqlx-cli`, even though later commands used `sqlx` and `cargo sqlx prepare`. Split the install commands and added `sqlx-cli --version 0.8.6 --no-default-features --features native-tls,postgres`.
- The Dockerfile used inline comments after `EXPOSE`; Docker treats `#` outside a comment line as an instruction argument. Moved the application comment to its own line and removed the unused debugger port.
- The post claimed debugging support and distributed compilation caching, but the Dockerfile did not configure a debugger or sccache distributed compilation. Removed the debugging claim and changed the sccache wording to compiler caching.
- The Compose file used the obsolete top-level `version: "3.8"` field. Removed it to match the current Compose Specification.
- The app depended on PostgreSQL and Redis with short `depends_on`, which does not wait for healthchecks. Added PostgreSQL and Redis healthchecks and changed `depends_on` to `service_healthy`.
- The tarpaulin command was intended to run inside Docker, but tarpaulin's Docker guidance requires relaxed seccomp settings. Added `SYS_PTRACE` and `seccomp=unconfined` to the app service for coverage runs.
- The Rust dependency versions were older than the current stable lines and produced future-incompatibility warnings in local checks. Updated Axum, tower, tower-http, SQLx, redis, and thiserror to current compatible major versions.
- The SQLx migration macro embeds files from `./migrations`, but the production Dockerfile did not copy migrations before building. Added `COPY migrations ./migrations`.
- The migration creation command produced a one-way migration, while the guide later showed `sqlx migrate revert`. Added SQLx's `-r` flag so reversible up/down migration files are created.

## Review Notes
- The Axum/SQLx example was compile-checked locally with the updated dependency versions after creating a `migrations/` directory.
- Docker is not installed in this review environment, so Docker and Compose snippets were validated against official documentation rather than by running a local Docker build.
- The `rust:1-*` image tags keep the tutorial current for development use. Production projects that require reproducible builds should pin exact Rust and CLI tool versions.
