# Validation Summary: Use App Engine Flexible Environment Custom Runtime to Deploy a Go Application

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google App Engine Flexible Environment
- App Engine custom runtimes
- Go
- Docker multi-stage builds
- Cloud SQL for PostgreSQL
- App Engine health checks
- Cloud Build and Artifact Registry

## Sources Consulted
- Google Cloud App Engine flexible environment app.yaml reference: https://docs.cloud.google.com/appengine/docs/flexible/reference/app-yaml
- Google Cloud App Engine flexible custom runtime documentation: https://docs.cloud.google.com/appengine/docs/flexible/custom-runtimes/build
- Google Cloud App Engine flexible testing and deployment documentation: https://docs.cloud.google.com/appengine/docs/flexible/testing-and-deploying-your-app
- Google Cloud SQL for PostgreSQL from App Engine flexible environment documentation: https://docs.cloud.google.com/sql/docs/postgres/connect-app-engine-flexible
- Go net/http package documentation: https://pkg.go.dev/net/http
- Go runtime package documentation: https://pkg.go.dev/runtime
- Go release history and support policy: https://go.dev/doc/devel/release

## Issues Found
- The Dockerfile used `golang:1.22-alpine`, which is outside the currently supported Go release window. Updated it to `golang:1.26-alpine`.
- The `.dockerignore` example used an inline comment on the `vendor/` pattern. Docker ignore comments must be standalone comment lines, so the example was changed to a commented-out `vendor/` pattern.
- The App Engine Flex `resources.memory_gb` value was `0.5` for `cpu: 1`, below the documented minimum requested memory of `0.6` GB. Updated it to `0.6`.
- The deployment flow said images are pushed to Container Registry. Container Registry has been shut down, and current App Engine deployments use Artifact Registry, so this was updated.
- The Cloud SQL Go example used `db.SetConnMaxLifetime(30 * 60)`, which is interpreted as a `time.Duration` in nanoseconds, not 30 minutes. Added the `time` import and changed it to `30 * time.Minute`.
- The Cloud SQL `app.yaml` example referenced `DB_PASS` in code but did not define it in the environment variable example. Added `DB_PASS`.
- The GOMAXPROCS tuning advice manually set `runtime.GOMAXPROCS(runtime.NumCPU())`, which can override current Go container-aware defaults. Replaced it with guidance to rely on the Go 1.25+ default or set the `GOMAXPROCS` environment variable explicitly.
- The gzip middleware snippet referenced imports and `gzipResponseWriter` without defining them. Added the missing imports and wrapper type.

## Review Notes
- The post still includes a legacy `/_ah/health` handler, but the primary configuration uses split liveness and readiness checks. Google Cloud marks legacy health checks as deprecated, so future revisions could remove the legacy handler if it is not needed for compatibility.
