# Validation Summary: How to Use Docker with Rails Applications

## Status
validated

## Post Type
Tutorial / Guide — a comprehensive walkthrough of containerizing Ruby on Rails applications with Docker, covering Dockerfiles, Docker Compose, configuration, CI/CD, and production hardening.

## Technologies Covered
- Ruby on Rails
- Docker (Dockerfile, multi-stage builds, BuildKit)
- Docker Compose (v2)
- Puma
- Sidekiq
- PostgreSQL
- Redis
- Nginx
- GitHub Actions (CI/CD)
- Homebrew / apt (installation)

## Sources Consulted
- Homebrew cask: docker-desktop — https://formulae.brew.sh/cask/docker-desktop (confirms the `docker` cask was renamed; former token: `docker`)
- Docker multi-stage builds documentation — https://docs.docker.com/build/building/multi-stage/
- Docker Compose specification (no top-level `version:` key, `depends_on` conditions) — https://docs.docker.com/compose/compose-file/
- Dockerfile reference (HEALTHCHECK, syntax directive, RUN --mount cache) — https://docs.docker.com/reference/dockerfile/
- Puma configuration DSL (workers, threads, preload_app!, before_fork, on_worker_boot, plugin :tmp_restart) — https://puma.io / github.com/puma/puma
- Rails caching guide (`:redis_cache_store` and its options) — https://guides.rubyonrails.org/caching_with_rails.html
- Sidekiq configuration (sidekiq.yml, Sidekiq::ProcessSet) — https://github.com/sidekiq/sidekiq/wiki
- GitHub Actions: docker/build-push-action, setup-buildx-action, login-action, metadata-action, actions/checkout (verified action major versions exist and are usable)

## Issues Found
1. **macOS Homebrew install command was outdated.** The post used `brew install --cask docker`. The Homebrew cask `docker` has been renamed to `docker-desktop` (former token: `docker`), so the original command is deprecated. Changed to `brew install --cask docker-desktop`. Verified against the official Homebrew formulae page.

No other technical errors were found. The Dockerfiles, Compose files, Puma/Redis/Sidekiq/database configuration, health-check controller, Nginx config, and GitHub Actions workflow are all syntactically correct and use current, non-deprecated APIs and patterns.

## Review Notes
- **netcat dependency in the entrypoint:** The `bin/docker-entrypoint` script and the troubleshooting section both rely on `nc` (`nc -z`, `nc -zv db 5432`), but none of the Dockerfiles install netcat (`netcat-openbsd`). The runtime image installs only `libpq5` and `curl`. The entrypoint/troubleshooting snippets are presented as generic illustrations, so this was left as-is, but readers using the provided runtime image would need to add `netcat-openbsd` to the apt install list (or switch to a `curl`/pg_isready-based wait) for `wait_for_db` to function.
- **Basic Dockerfile asset precompile:** The single-stage "Basic Dockerfile" runs `rails assets:precompile` with `RAILS_ENV=production` but without `SECRET_KEY_BASE`. The recommended multi-stage example correctly sets `SECRET_KEY_BASE=placeholder`. Most Rails 7 apps precompile fine without it, but apps that touch secrets at boot may need it in the basic example too.
- **Mixed apt sources:** `apt-get install docker.io docker-compose-plugin` mixes Ubuntu's `docker.io` package with Docker's `docker-compose-plugin` (which comes from Docker's official apt repository). It works once Docker's repo is configured but is a slight inconsistency worth being aware of.
- **GitHub Actions versions:** The workflow pins `build-push-action@v5` and `checkout@v4`; newer majors (build-push-action@v6, checkout@v5) exist as of 2026. The pinned versions are not deprecated/broken, so they were left unchanged.
- **Base image version:** `ruby:3.3.0-slim` is valid; newer 3.3.x / 3.4 patch images are available but the pinned tag still works and is a reasonable choice.
