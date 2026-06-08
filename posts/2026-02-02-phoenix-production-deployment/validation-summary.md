# Validation Summary: How to Deploy Phoenix Applications to Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elixir (1.14+, with Phoenix 1.7)
- Phoenix Framework (1.7.x)
- Mix releases / OTP releases
- Ecto / Ecto.Migrator (3.10)
- Docker / Docker Compose (multi-stage builds, hexpm/elixir base image)
- PostgreSQL (15-alpine)
- Nginx (reverse proxy, TLS, WebSocket upgrade)
- systemd (service units, hardening directives)
- Telemetry / Telemetry.Metrics / telemetry_poller
- TelemetryMetricsPrometheus
- Kubernetes (Deployment, Service, Ingress, Job, probes)
- cert-manager, Let's Encrypt
- ArgoCD (PreSync hook annotation)

## Sources Consulted
- Phoenix deployment guide: https://hexdocs.pm/phoenix/deployment.html
- Phoenix releases guide: https://hexdocs.pm/phoenix/releases.html
- Phoenix-generated Dockerfile template (Phoenix 1.7): https://hexdocs.pm/phoenix/releases.html#containers
- Elixir Mix.Tasks.Release: https://hexdocs.pm/mix/Mix.Tasks.Release.html
- Elixir Config module / runtime.exs: https://hexdocs.pm/elixir/Config.html
- Ecto.Migrator docs (with_repo/3, run/4, migrations/1): https://hexdocs.pm/ecto_sql/Ecto.Migrator.html
- Telemetry.Metrics: https://hexdocs.pm/telemetry_metrics/Telemetry.Metrics.html
- Phoenix.Tracker: https://hexdocs.pm/phoenix_pubsub/Phoenix.Tracker.html
- hexpm/elixir Docker images: https://hub.docker.com/r/hexpm/elixir
- Kubernetes Ingress / Probes API references: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Nginx WebSocket proxy guide: https://nginx.org/en/docs/http/websocket.html
- systemd.exec / systemd.service directives: https://www.freedesktop.org/software/systemd/man/

## Issues Found
1. **Dockerfile would fail to build** — the build stage had `COPY config config` followed by `RUN mkdir config`. The `mkdir` would error out because the `config` directory already existed from the prior COPY. Fixed by removing the redundant early `COPY config config` (the specific compile-time config files are intentionally copied separately later, matching the official Phoenix-generated Dockerfile pattern that exists to maximize Docker layer caching when only application code changes).
2. **`MyApp.Telemetry` vs `MyAppWeb.Telemetry` inconsistency** — the telemetry supervisor was defined as `MyApp.Telemetry` in `lib/my_app/telemetry.ex`, but the example `application.ex` listed `MyAppWeb.Telemetry` in its children list. That would have crashed at startup with an `undefined module` error. Changed the application.ex example to reference `MyApp.Telemetry` to match the defined module.

## Review Notes
- `config :phoenix, :serve_endpoints, true` in `config/prod.exs` is legacy/redundant once `config :my_app, MyAppWeb.Endpoint, server: true` is set in `runtime.exs` (which the post does). Not incorrect — just superfluous in modern Phoenix. Left as-is since it does no harm.
- `kubernetes.io/ingress.class: nginx` annotation in the Ingress manifest is the deprecated style; modern Kubernetes prefers the `ingressClassName` field in the spec. Still functional in current clusters, so left as-is.
- `docker-compose.yml` uses `version: "3.8"` — the top-level `version` key is deprecated in Compose v2 but is ignored rather than rejected. No action needed.
- `Phoenix 1.6 and later include release configuration by default` — slightly understated; `mix release` support has been the Phoenix default since Phoenix 1.5. Statement is not wrong, just conservative.
- `Phoenix.Tracker.list(MyAppWeb.Presence, "users")` works (Presence is a Tracker), but the more idiomatic API for Presence is `MyAppWeb.Presence.list("users")`, which returns a map keyed by user id. Functional difference is minor; left as authored.
- `queue_target: 5_000` is well above the DBConnection default of 50ms — intentional in the post (production-tolerant) and valid, but readers should size it to their workload.
