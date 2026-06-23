# Validation Summary: How to Containerize Python Apps with Multi-Stage Dockerfiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python (3.11 / 3.12)
- Docker multi-stage builds
- pip
- Poetry (1.7.1)
- uv (Astral)
- Distroless images (`gcr.io/distroless/python3-debian12`)
- Alpine Linux base images
- Flask, FastAPI, Django, gunicorn, uvicorn
- Security scanning (safety, pip-audit, Trivy)
- GitHub Actions CI

## Sources Consulted
- Docker multi-stage build documentation — https://docs.docker.com/build/building/multi-stage/
- Astral uv Docker integration guide — https://docs.astral.sh/uv/guides/integration/docker/
- Poetry CLI documentation & export plugin — https://python-poetry.org/docs/cli/ , https://github.com/python-poetry/poetry-plugin-export
- Poetry 1.7.0 release notes (export deprecation warning) — https://python-poetry.org/blog/announcing-poetry-1.7.0/
- GoogleContainerTools/distroless Python images — https://github.com/GoogleContainerTools/distroless and issue #1543 (venv binary path incompatibility)
- OneUptime: "How to Build a Distroless Python Container Image with a Virtual Environment" — https://oneuptime.com/blog/post/2026-02-17-how-to-build-a-distroless-python-container-image-with-a-virtual-environment-for-cloud-run/view
- aquasecurity/trivy-action — https://github.com/aquasecurity/trivy-action

## Issues Found
1. **Distroless example was non-functional (fixed).** The original example built the virtual environment on `python:3.12-slim` and copied it into `gcr.io/distroless/python3-debian12`. This fails for two verified reasons:
   - The Debian 12 distroless image ships **Python 3.11**, not 3.12. Packages installed under `/opt/venv/lib/python3.12/site-packages` are not importable by the 3.11 interpreter.
   - The venv's `bin/python` symlink points to `/usr/local/bin/python3.11` (the official image path), whereas distroless places its interpreter at `/usr/bin/python3.11`. As documented in GoogleContainerTools/distroless issue #1543, the venv therefore does not work, and `CMD ["/opt/venv/bin/python", ...]` references a broken symlink.

   **Fix applied:** Changed the builder to `python:3.11-slim-bookworm` (matching the distroless Python 3.11), copied the venv and exposed its packages via `ENV PYTHONPATH="/opt/venv/lib/python3.11/site-packages"`, and changed the `CMD` to `["-m", "gunicorn", ...]` so it passes arguments to the distroless image's built-in Python entrypoint instead of relying on the broken venv symlink. Comments were updated to explain the version match and entrypoint behavior. This matches the documented working pattern (including OneUptime's own distroless post).

## Review Notes
- **Poetry export deprecation:** `poetry export -f requirements.txt` works with the pinned Poetry 1.7.1 (the `poetry-plugin-export` plugin is still bundled), but Poetry 1.7.0+ emits a future-deprecation warning that the plugin will not ship by default in later versions. The example is correct for the pinned version; users upgrading Poetry should add `poetry-plugin-export` explicitly. Left as-is since it is accurate for 1.7.1.
- **`safety check`:** The legacy `safety check -r requirements.txt` command still works but is being superseded by `safety scan` in newer Safety CLI releases. The example wraps it with `|| true`, so it is non-blocking and functional. Left as-is.
- All other Dockerfiles (pip, Poetry direct install, uv, Alpine, FastAPI, Django, layer-caching, `.dockerignore`, Trivy CI) were verified and are syntactically correct and use current, non-deprecated APIs and package names. The uv `COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv` pattern and `uv pip install --python=...` flags are correct per Astral's docs.
- Image-size figures in the comparison table are illustrative approximations and reasonable.
