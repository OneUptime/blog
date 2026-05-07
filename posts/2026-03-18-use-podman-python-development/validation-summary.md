# Validation Summary: How to Use Podman for Python Development

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Podman
- Python
- Flask
- Django
- PostgreSQL
- Compose files
- `pytest` / `pytest-cov`
- `pdb`
- `debugpy`

## Sources Consulted
- Podman documentation: https://docs.podman.io/en/latest/
- `podman compose` man page: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman rootless mode: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman volume mount options: https://docs.podman.io/en/v4.3/markdown/options/volume.html
- Podman build reference: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Docker Official Python image tags: https://github.com/docker-library/official-images/blob/master/library/python
- Docker Official Python image Dockerfiles: https://raw.githubusercontent.com/docker-library/python/master/3.12/bookworm/Dockerfile
- Docker Official Python slim Dockerfile: https://raw.githubusercontent.com/docker-library/python/master/3.12/slim-bookworm/Dockerfile
- Docker Official Python Alpine Dockerfile: https://raw.githubusercontent.com/docker-library/python/master/3.12/alpine3.23/Dockerfile
- Flask development server docs: https://flask.palletsprojects.com/en/stable/server/
- Flask API docs for `app.run()`: https://flask.palletsprojects.com/en/latest/api/
- Django development server docs: https://docs.djangoproject.com/en/4.2/intro/tutorial01/
- Django settings reference: https://docs.djangoproject.com/en/4.2/ref/settings/
- Compose file reference: https://docs.docker.com/reference/compose-file/
- Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Compose services reference (`depends_on`, `volumes`): https://docs.docker.com/reference/compose-file/services/
- Compose startup ordering and health checks: https://docs.docker.com/compose/how-tos/startup-order/
- pytest documentation: https://docs.pytest.org/en/stable/usage.html
- pytest-cov options: https://pytest-cov.readthedocs.io/en/latest/config.html
- Python `pdb` docs: https://docs.python.org/3.14/library/pdb.html
- debugpy command-line reference: https://github.com/microsoft/debugpy/wiki/Command-Line-Reference
- VS Code Python debugging docs: https://code.visualstudio.com/docs/python/debugging

## Issues Found
- The post used `podman-compose` as if it were the primary Podman interface. I changed the commands to `podman compose` and added a note that Podman delegates Compose work to an external provider, because that is the current Podman-documented workflow.
- The Django example was labeled as `docker-compose.yml` and included `version: "3.8"`. I updated it to `compose.yaml` and removed the obsolete top-level `version` field to match the current Compose specification.
- The Django example set `DATABASE_URL` without explaining that vanilla Django does not read that variable automatically. I changed the example to explicit PostgreSQL environment variables and added a note that the Django settings must read them.
- The Django `depends_on` example only guaranteed startup order, not database readiness. I added a PostgreSQL health check and `condition: service_healthy` so the web service waits for the database to be ready.
- The coverage example used `pytest`'s `--cov` flags without noting that they come from `pytest-cov`. I added that requirement to the snippet comment.
- The introduction said Podman "does not require root privileges." I tightened that wording to "can run without root privileges" to better match Podman's documented rootless behavior.

## Review Notes
- The Flask example remains technically valid, but Flask's current documentation recommends `flask run --debug` over relying on `app.run(..., debug=True)` for development workflows.
- Podman is not installed in this workspace, so Podman CLI syntax and behavior were verified against official documentation rather than local `--help` output.
- The Python image tags shown in the post are valid major/minor tags, but they resolve to newer patch releases over time.
- Local checks: `validation.json` was validated with `jq`.
