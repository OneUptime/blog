# Validation Summary: How to Deploy Deno Applications to Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno (runtime, v1.40.0 examples)
- Oak HTTP framework (v12.6.1)
- Docker (multi-stage builds, HEALTHCHECK)
- systemd (service unit, hardening directives)
- Kubernetes (Deployment, Service, Ingress, HPA, Secret)
- NGINX (reverse proxy, TLS termination)
- Prometheus / Grafana / Loki / AlertManager (observability)
- GitHub Actions (CI/CD)
- TypeScript

## Sources Consulted
- Deno CLI reference: https://docs.deno.com/runtime/reference/cli/
- Deno `cache` subcommand docs: https://docs.deno.com/runtime/reference/cli/cache/
- Deno `eval` subcommand docs: https://docs.deno.com/runtime/reference/cli/eval/
- Deno `run` subcommand docs: https://docs.deno.com/runtime/reference/cli/run/
- Oak framework releases: https://github.com/oakserver/oak/releases (verified v12.6.1 exists and supports `signal` option on `app.listen()`)
- Official Deno Docker image: https://hub.docker.com/r/denoland/deno (Debian-based, supports `addgroup`/`adduser`)
- Dockerfile HEALTHCHECK reference: https://docs.docker.com/reference/dockerfile/#healthcheck
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#deployment-v1-apps
- Kubernetes HorizontalPodAutoscaler v2: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Kubernetes Ingress reference: https://kubernetes.io/docs/concepts/services-networking/ingress/
- systemd.service / systemd.exec man pages: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- NGINX HTTP module docs: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- GitHub Actions: `denoland/setup-deno`, `docker/build-push-action@v5`, `docker/metadata-action@v5`, `docker/setup-buildx-action@v3`, `docker/login-action@v3`, `azure/setup-kubectl@v3`, `codecov/codecov-action@v3`, `actions/checkout@v4` — all verified as published versions.

## Issues Found

1. **Broken Dockerfile HEALTHCHECK (Deno script source).** The original command was:
   ```
   CMD ["deno", "run", "--allow-net", "-", "fetch(...).then(r => r.ok ? Deno.exit(0) : Deno.exit(1))"]
   ```
   `deno run -` reads the script from stdin, but the Docker HEALTHCHECK exec form does not pipe anything to stdin, so Deno would block (or fail) and the trailing string would be parsed as a script argument, not as the script source. Fixed to use `deno eval` with the inline script as the argument, which is the documented way to execute an inline program:
   ```
   CMD ["deno", "eval", "--allow-net", "const r = await fetch('http://localhost:8000/health/live'); Deno.exit(r.ok ? 0 : 1);"]
   ```

2. **Invalid `deno cache` argument in Docker stage 1.** The original `RUN deno cache --lock=deno.lock deno.json` is not a valid command — `deno cache` requires a JavaScript/TypeScript module file (or remote URL), not a JSON manifest. Fixed to copy `main.ts` into the stage and cache it instead:
   ```
   COPY deno.json deno.lock main.ts ./
   RUN deno cache --lock=deno.lock main.ts
   ```
   (For Deno 1.40, this is the standard way to populate `/deno-dir` before the build stage; `deno install` for resolving deps directly from `deno.json` was added in later Deno versions.)

## Review Notes

The following are technically functional but worth being aware of:

- **Deno version (1.40.0).** Deno 2.x (released October 2024) is the current major line as of the post's date (Jan 2026). The 1.40.0 images, the Oak v12.6.1 import, and all `Deno.*` APIs used here still work, but readers may want to use a newer base image for security updates. Left as-is because the code is correct for the version pinned in the post.
- **`X-XSS-Protection` header in the NGINX config.** This header is deprecated and most modern browsers ignore it; some guidance recommends omitting it entirely. Left in place because it does no harm and matches the author's wider "defense in depth" headers section.
- **`kubectl ... --record` flag in the GitHub Actions deploy step.** Deprecated since Kubernetes 1.22 but still functional. Will eventually need replacing with explicit `kubernetes.io/change-cause` annotations.
- **`kubernetes.io/ingress.class` annotation on the Ingress.** Deprecated in favor of `spec.ingressClassName` since Kubernetes 1.18. Still honored by the NGINX ingress controller for backwards compatibility.
- **`StartLimitInterval` under `[Service]` in the systemd unit.** The canonical location since systemd 230 is `StartLimitIntervalSec` under `[Unit]`, but the legacy name and section are still accepted.
- **`deno cache --lock=deno.lock main.ts` then `deno check main.ts` in stage 2 builder.** This re-runs caching after the cache stage copies `/deno-dir`. That is fine and idempotent (no re-download when lockfile matches), just slightly redundant; left unchanged because it does not affect correctness.
- **`Deno.addSignalListener("SIGTERM", ...)`** is correctly used; on Linux this requires no extra flag in 1.40.0+. The graceful-shutdown pattern (flip readiness to false, then abort after a delay) is sound.
