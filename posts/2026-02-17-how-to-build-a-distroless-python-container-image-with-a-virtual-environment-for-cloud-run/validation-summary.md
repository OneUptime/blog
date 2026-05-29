# Validation Summary: How to Build a Distroless Python Container Image with a Virtual Environment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python virtual environments
- Flask
- Waitress
- Gunicorn
- Docker multi-stage builds
- Google Distroless container images
- Google Cloud Run
- Google Cloud Build
- Google Artifact Registry

## Sources Consulted
- GoogleContainerTools Distroless README: https://github.com/GoogleContainerTools/distroless
- Distroless image metadata via `docker manifest inspect` and `docker image inspect` for `gcr.io/distroless/python3-debian12` and `gcr.io/distroless/python3-debian13`
- Python `datetime` documentation: https://docs.python.org/3.12/library/datetime.html
- Python `venv` documentation: https://docs.python.org/3/library/venv.html
- Dockerfile reference for exec-form `CMD` and `ENTRYPOINT`: https://docs.docker.com/reference/builder
- Gunicorn running documentation: https://gunicorn.org/run/
- Google Cloud SDK `gcloud run deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud Build substitutions documentation: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Build config schema: https://docs.cloud.google.com/build/docs/build-config-file-schema

## Issues Found
- The Docker examples used `python:3.12-slim` with `gcr.io/distroless/python3-debian12`. The current `python3-debian12` image uses Python 3.11, so the copied Python 3.12 dependency path would not match the runtime. Updated the examples to `python:3.13-slim`, `gcr.io/distroless/python3-debian13`, and `python3.13` site-packages paths.
- The Docker examples used `CMD ["python", "app.py"]`, but Distroless Python images have a Python runtime entrypoint. This would pass `python` as a script argument rather than invoking a shell or a second Python executable. Updated the commands to `CMD ["app.py"]`, and updated the Gunicorn module form to `CMD ["-m", "gunicorn", "--config", "gunicorn_config.py", "app:app"]`.
- The runtime image added `/opt/venv/bin` to `PATH`, but copied virtual environment console scripts can have builder-specific shebangs and the examples do not need those scripts at runtime. Removed the runtime `PATH` override and kept `PYTHONPATH` pointed at the copied site-packages directory.
- The Flask sample used `datetime.utcnow()`, which is deprecated in Python 3.12 and later. Updated it to `datetime.now(UTC)`.
- The post stated that Gunicorn requires a shell to start workers. Gunicorn's official documentation provides a `gunicorn` executable and the post already uses a shell-free module invocation. Reworded the Waitress explanation to avoid the incorrect claim.
- The text described the virtual environment as self-contained. Python's `venv` documentation notes that virtual environments depend on a base Python installation and are not generally copyable. Reworded the explanation to say the virtual environment contains the installed packages and must be paired with a compatible Python runtime.

## Review Notes
- The Cloud Run deploy command flags and Cloud Build YAML structure are current. `$SHORT_SHA` is a Cloud Build substitution normally populated by triggers; manual builds need an explicit substitution if that value is required.
- Image sizes are approximate and change over time as base images are rebuilt.
