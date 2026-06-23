# Validation Summary: How to Containerize React Applications with Multi-Stage Docker Builds

## Status
validated

## Post Type
Tutorial / Guide (hands-on, code-heavy walkthrough of containerizing React apps with multi-stage Docker builds)

## Technologies Covered
- Docker (multi-stage builds, BuildKit cache mounts, `buildx` multi-arch, `.dockerignore`)
- React build tooling (Create React App / `react-scripts`, Vite, Next.js static export)
- Nginx (SPA routing, caching, gzip/Brotli, security headers, non-root hardening)
- Caddy v2 (Caddyfile, SPA routing)
- Distroless base images + Go static file server
- Node.js (`npm ci`, `NODE_OPTIONS` memory tuning)
- GitHub Actions (Buildx, metadata-action, build-push-action, Trivy, CodeQL upload-sarif)
- Docker Compose

## Sources Consulted
- Official nginx Docker image docs / "running as non-root" gotchas — https://hub.docker.com/_/nginx and community references on privileged-port binding (e.g., https://nickjanetakis.com/blog/binding-to-low-ports-as-a-non-root-user-with-docker-and-kubernetes)
- GitHub Changelog: "CodeQL Action v2 is now retired" (Jan 2025) — https://github.blog/changelog/2025-01-10-code-scanning-codeql-action-v2-is-now-deprecated/
- `eliben/static-server` (real, installable Go static server) — https://github.com/eliben/static-server
- Caddy v2 docs — `try_files`, `file_server`, directive ordering & SPA pattern — https://caddyserver.com/docs/caddyfile/directives/try_files and https://caddyserver.com/docs/caddyfile/patterns
- Next.js static export (`output: 'export'`) — https://nextjs.org/docs/app/guides/static-exports
- Docker multi-stage build & BuildKit cache mount docs — https://docs.docker.com/build/building/multi-stage/

## Issues Found
1. **Non-root nginx could not bind to port 80 (breaking).** The "Production-Ready Dockerfile" set `USER nginx` while the nginx config listens on `port 80`. A non-root user cannot bind to privileged ports (<1024), so the container would fail at startup with `bind() to 0.0.0.0:80 failed (13: Permission denied)`. Fixed by adding the file capability before switching users:
   ```dockerfile
   RUN apk add --no-cache libcap && \
       setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx
   ```
   This keeps the post's port-80 design consistent (EXPOSE 80, health check, nginx.conf) while making the non-root run actually work.

2. **Distroless example used a non-existent Go package and wrong flags (breaking).** The example ran `go install github.com/nicholasjackson/static-server@latest` (no such package) and `CMD ["/static-server", "-path=/public", "-port=8080"]` (no `-path` flag). Replaced with the real, installable `github.com/eliben/static-server`, passed the serve directory as the positional argument it expects, added `-host 0.0.0.0` (its default `localhost` host would not be reachable from outside the container), and set `ENV CGO_ENABLED=0` so the binary is statically linked and runs on the glibc-based distroless image (it is built on alpine/musl).

3. **Retired CodeQL Action version (breaking in CI).** The GitHub Actions workflow used `github/codeql-action/upload-sarif@v2`. CodeQL Action v2 was retired in January 2025 and no longer runs. Updated to `@v3` (currently supported; v4 also exists).

## Review Notes
- **Create React App is deprecated.** CRA / `react-scripts` was officially deprecated in early 2025. The examples remain syntactically correct and still work, and the post does note Vite is now preferred, so this was left as-is rather than rewritten. Readers starting new projects should prefer Vite or a framework.
- **`docker-compose` `version: '3.8'`** is obsolete under Compose v2 — it now emits a warning and is ignored (not an error). Left unchanged; harmless.
- **`env.sh` runtime injection.** The standalone `env.sh` that ends with `exec nginx -g 'daemon off;'` is then copied into `/usr/share/nginx/html`'s entrypoint as `/docker-entrypoint.d/40-env.sh`. Scripts in `/docker-entrypoint.d/` are normally setup-only (the image entrypoint launches nginx afterward); the `exec nginx` line makes the script itself launch nginx. It functions in practice but is a slightly unconventional pattern. Left as-is since it is not broken.
- **`npm ci --ignore-scripts`** in the deps stage speeds up/hardens installs but will skip legitimate `postinstall` steps if a dependency relies on one. Fine for most React apps; worth being aware of.
- Caddy `file_server` is written before `try_files` in the Caddyfile, but Caddy auto-sorts directives (default order places `try_files` before `file_server`), so SPA routing works correctly regardless of source order. No change needed.
- Image-size figures, `npm ci` requiring `package-lock.json`, BuildKit cache mounts, multi-arch `buildx` commands, Next.js `output: 'export'`, and the `REACT_APP_`/`VITE_` build-time env-var behavior are all accurate.
