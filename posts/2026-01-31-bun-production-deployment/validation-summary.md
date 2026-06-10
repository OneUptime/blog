# Validation Summary: How to Deploy Bun Applications to Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun (JavaScript runtime)
- Docker (multi-stage builds, docker-compose)
- Kubernetes (Deployment, Service, Ingress, HPA, Secrets)
- systemd (service unit files for bare metal)
- NGINX (reverse proxy, TLS termination)
- GitHub Actions (CI/CD pipeline)
- Prometheus (metrics endpoint)
- TypeScript (application code)
- PostgreSQL, Redis (supporting services in compose)

## Sources Consulted
- Bun official documentation — https://bun.sh/docs (Bun.serve API, TLS options, build CLI, install CLI)
- Bun Docker images on Docker Hub — https://hub.docker.com/r/oven/bun/tags
- Bun lockfile docs — https://bun.sh/docs/install/lockfile
- oven-sh/setup-bun GitHub Action — https://github.com/oven-sh/setup-bun
- Kubernetes API reference (apps/v1 Deployment, autoscaling/v2 HPA, networking.k8s.io/v1 Ingress)
- Prometheus exposition format specification
- systemd.service(5) man page
- NGINX `ngx_http_ssl_module` documentation

## Issues Found
1. **Outdated Docker image tag**: The Dockerfile referenced `oven/bun:1.1-alpine`, which is not a published tag on Docker Hub. Updated all three stage `FROM` lines to `oven/bun:1-alpine` (a valid published tag that tracks the Bun 1.x major-version line).
2. **Deprecated lockfile filename**: Bun 1.2 switched the default lockfile from binary `bun.lockb` to text-based `bun.lock`. Updated the two `COPY package.json bun.lockb ./` lines in the Dockerfile to use `bun.lock`.
3. **Outdated GitHub Action version**: The CI workflow used `oven-sh/setup-bun@v1`; v2 is the current major and is what Bun's own docs reference. Updated to `oven-sh/setup-bun@v2`.

## Review Notes
- The `kubernetes.io/ingress.class: nginx` annotation in the Ingress is the legacy mechanism — newer clusters prefer the `ingressClassName` spec field. Both still work with the NGINX ingress controller, so this is not strictly incorrect, just dated.
- The `version: "3.8"` field in `docker-compose.yml` is ignored by modern Docker Compose v2 and emits a warning on some versions; harmless but no longer needed.
- The pod spec sets `readOnlyRootFilesystem: true` without mounting an `emptyDir` at `/tmp`. Depending on what the Bun process or its dependencies write at runtime, this may need a writable tmp volume in practice — worth flagging to readers who copy this manifest verbatim.
- The Prometheus exposition output in `generateMetrics()` puts a blank line between the `# HELP` and `# TYPE` lines for `bun_memory_heap_used_bytes`. The format allows blank lines so parsers still accept it, but adjacent HELP/TYPE pairs are the documented convention.
- `Type=simple` in the systemd unit is valid; modern systemd often prefers `Type=exec` for stricter startup semantics, but `simple` works correctly here.
- All Bun runtime APIs used (`Bun.serve`, `server.stop()`, `tls` options, `error` handler), the `bun build` CLI flags (`--outdir`, `--target bun`), and `bun install` flags (`--frozen-lockfile`, `--production`) verified against current Bun documentation.
