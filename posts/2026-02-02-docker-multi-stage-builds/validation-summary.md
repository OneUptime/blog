# Validation Summary: How to Use Multi-Stage Docker Builds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker / Dockerfile multi-stage builds
- Node.js (npm, npm ci)
- Go (CGO_ENABLED, ldflags, scratch base image)
- Python (venv, pip, gunicorn)
- Java (Maven, Eclipse Temurin, Spring Boot, container-aware JVM flags)
- Rust (cargo, musl static linking)
- React / nginx (frontend build & serve)
- ARG / ENV / LABEL Dockerfile instructions
- OCI image labels
- safety, pip-audit (Python vulnerability scanning)
- .dockerignore

## Sources Consulted
- Docker official documentation on multi-stage builds: https://docs.docker.com/build/building/multi-stage/
- Dockerfile reference (ARG, COPY --from, FROM): https://docs.docker.com/reference/dockerfile/
- npm CLI documentation for `npm ci`: https://docs.npmjs.com/cli/v10/commands/npm-ci (`--only` deprecated in favor of `--omit`)
- Go documentation for build flags (CGO_ENABLED, -ldflags="-s -w"): https://pkg.go.dev/cmd/go and https://pkg.go.dev/cmd/link
- Python venv module documentation: https://docs.python.org/3/library/venv.html
- gunicorn documentation: https://docs.gunicorn.org/
- Maven CLI reference (`-DskipTests`, `dependency:go-offline`, `-B` batch mode)
- Eclipse Temurin Docker tags on Docker Hub: https://hub.docker.com/_/eclipse-temurin
- JVM container-aware flags (`-XX:+UseContainerSupport`, `-XX:MaxRAMPercentage`): OpenJDK / Oracle docs
- Cargo book on Docker caching patterns: https://doc.rust-lang.org/cargo/
- Alpine BusyBox `addgroup`/`adduser` reference
- nginx configuration directives: https://nginx.org/en/docs/
- OCI image annotations spec (org.opencontainers.image.*): https://github.com/opencontainers/image-spec/blob/main/annotations.md
- safety CLI documentation: `safety check` deprecated in safety 3.x in favor of `safety scan` (https://docs.safetycli.com/safety-docs/safety-cli/scanning-with-the-cli)
- pip-audit documentation: https://pypi.org/project/pip-audit/

## Issues Found
1. **`npm ci --only=production` is deprecated** — npm deprecated `--only=production` in npm 7+ in favor of `--omit=dev`. Replaced both occurrences (in the basic Node.js example and in the Testing Stage Pattern example) with `npm ci --omit=dev` so the post matches current npm guidance.
2. **`safety check` is deprecated** — safety 3.x (released 2024) deprecated the `check` subcommand in favor of `safety scan`. Also updated the deprecated `--json` flag to the current `--output json` form. Changed `RUN safety check -r requirements.txt --json > /tmp/safety-report.json || true` to `RUN safety scan -r requirements.txt --output json > /tmp/safety-report.json || true`.

## Review Notes
- The Go example uses `golang:1.22-alpine` and the Rust example uses `rust:1.75-alpine`. These tags exist and the examples remain valid, though newer minor versions (Go 1.24+, Rust 1.82+) are available as of 2026. Not changed since the post does not claim to use the latest version, and the patterns demonstrated are version-agnostic.
- In the Node.js example, `RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001` creates the user without explicitly assigning it to the `nodejs` group via `-G nodejs`. This is a common pattern in many Alpine Dockerfiles and the user is still functional, but a stricter version would use `adduser -S -G nodejs -u 1001 nodejs`. Left unchanged because it works and the post is illustrative.
- In the Testing Stage Pattern, `FROM deps AS builder` already includes all dependencies (since `npm ci` in the `deps` stage installs dev deps by default), so the later `RUN npm ci --include=dev` in the `tester` stage is redundant. The author's inline comment ("if separated") acknowledges this is conditional. Left as-is.
- The Rust caching pattern uses `cargo init` to seed a dummy project, which works in an empty WORKDIR but is unusual; the more common pattern is `mkdir src && echo 'fn main() {}' > src/main.rs`. The author's approach is functionally correct, so it was left unchanged.
- `-XX:+UseContainerSupport` has been on by default since JDK 10/11; including it explicitly in the Java example is harmless and documents intent.
- The frontend example assumes Create React App's `build/` output directory. Newer Vite-based projects use `dist/` — readers using Vite would need to adjust the `COPY --from=builder /app/build` path. Not changed as the post explicitly frames the example as a React app using `npm run build`.
