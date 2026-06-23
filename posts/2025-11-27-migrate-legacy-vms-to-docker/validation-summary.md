# Validation Summary: How to Migrate Legacy VMs to Docker Containers

## Status
validated

## Post Type
Tutorial / Guide (step-by-step migration blueprint)

## Technologies Covered
- Docker (image builds, `docker build`, `docker run`, volumes, `docker logs`)
- Dockerfiles (multi-stage, `python:3.11-slim` base, `ENTRYPOINT`, `EXPOSE`, `ENV`)
- Python / Poetry dependency management (`poetry export`)
- Gunicorn (WSGI server)
- Linux inventory tooling (`apt`, `systemctl`, `ss`, cron, osquery, Ansible `setup`, Chef ohai)
- Container orchestration runtimes (Docker Swarm, Kubernetes, ECS, Nomad)
- Observability (cAdvisor, OneUptime)
- Deployment strategies (blue/green, canary weighting, feature flags, rollback)

## Sources Consulted
- Poetry CLI documentation — `export` command / plugin status: https://python-poetry.org/docs/cli/
- poetry-plugin-export project: https://github.com/python-poetry/poetry-plugin-export
- Docker CLI reference (`docker build`, `docker run`, `--env-file`, `-p`): https://docs.docker.com/reference/cli/docker/
- Gunicorn settings/CLI (`-b`, `--workers`): https://docs.gunicorn.org/en/stable/settings.html
- iproute2 `ss`, `systemctl`, and `apt list` standard man pages

## Issues Found
1. **Broken Dockerfile step — `poetry export` not available in Poetry 2.0+** (Step 4 Dockerfile). The image ran `pip install poetry` followed by `poetry export -f requirements.txt`. Since Poetry 2.0 (released 2025-01-05), the `export` command is no longer bundled with Poetry core — it now requires the separate `poetry-plugin-export` package. A fresh `pip install poetry` pulls Poetry 2.x, so the build would fail with "The command 'export' does not exist." Fixed by installing the plugin: `pip install poetry poetry-plugin-export`. Verified against the official Poetry CLI docs, which state the plugin "is no longer installed by default with Poetry 2.0."
2. **Incorrect step count in the intro.** The introduction described a "seven-step blueprint," but the post contains nine numbered steps (1–9). Changed "seven-step" to "nine-step" to match the actual content.

## Review Notes
- The `gunicorn app.wsgi:application` callable is valid for a Django-style project where `wsgi.py` exposes an `application` object; readers should adjust the module path to their own app.
- `chef-ohai` is described as a fact-collection tool; the actual binary is `ohai` (shipped with Chef). Left as-is since it is used descriptively, not as a literal command to run.
- The "Blue/Green" bullet actually describes weighted/canary traffic shifting rather than a strict blue/green cutover (which swaps all traffic at once). This is a conceptual simplification, not a technical error, so it was left unchanged.
- All other commands (`apt list --installed`, `systemctl list-units --type=service`, `ss -tulpn`, `docker build`, `docker run -p 8080:8000 --env-file ...`) are syntactically correct and current.
