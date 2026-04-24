# Validation Summary: How to Configure Trusted Origins in Portainer for Reverse Proxies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Reverse proxies
- CSRF protection
- HTTP `Origin` handling

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer release notes (`2.27.9` LTS addition of `--trusted-origins` and `TRUSTED_ORIGINS`): https://docs.portainer.io/release-notes?fallback=true
- Portainer CE Docker install documentation: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer source for CLI flag and environment variable wiring: https://github.com/portainer/portainer/blob/develop/api/cli/cli.go
- Portainer source for trusted origin environment variable constant: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source for trusted origin validation at startup: https://github.com/portainer/portainer/blob/develop/api/cmd/portainer/main.go
- Portainer source tests for valid and invalid trusted origin formats: https://github.com/portainer/portainer/blob/develop/pkg/validate/validate_test.go
- Go standard library `net/http` cross-origin protection source: https://go.dev/src/net/http/csrf.go

## Issues Found
- The post described `--trusted-origins` as a general allowlist for API requests. Portainer's current implementation only applies this to unsafe cross-origin browser requests under its CSRF protection, so the explanation was corrected.
- The post claimed Portainer derives a default trusted origin from the access URL. Current Portainer behavior allows same-origin requests automatically and only uses `--trusted-origins` for explicit cross-origin exceptions, so that explanation was corrected.
- The Docker Compose example was malformed because it duplicated the `volumes` key under the service and misplaced the top-level named volume definition. The snippet was corrected to valid Compose structure and updated to a working Portainer deployment example.
- The environment variable name was incorrect. The post used `PORTAINER_TRUSTED_ORIGINS`, but Portainer currently exposes `TRUSTED_ORIGINS`, so the snippet and note were corrected.
- The version caveat was incomplete. The post implied only the environment variable had version-specific support, but Portainer added both the CLI flag and environment variable in `2.27.9` LTS and `2.31.3` STS, so the note was corrected.
- The origin-validation test used `OPTIONS` and instructed readers to look for `Access-Control-Allow-Origin`, which mixes CORS preflight behavior with Portainer's CSRF protection. The example was replaced with a browser-like `POST` request and guidance to check for HTTP `403`.
- The security section claimed `--trusted-origins='*'` disables CSRF protection. Current Portainer validation requires explicit origins in `scheme://host[:port]` form, so `*` is not a valid value. That guidance was corrected.
- The command examples were expanded into working Portainer startup examples instead of minimal flag-only invocations that would not produce an accessible, normally usable Portainer deployment.

## Review Notes
- The corrected post now matches current Portainer and Go CSRF behavior as reviewed on `2026-04-24`.
- Trusted origins must be exact origins in `scheme://host[:port]` form. Paths, query strings, fragments, bare hostnames, and wildcards are rejected.
- Safe methods such as `GET`, `HEAD`, and `OPTIONS` are always allowed by Go's `CrossOriginProtection`, so they are not useful for validating this setting.
