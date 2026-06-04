# Validation Summary: How to Run Devpi in Docker (Private PyPI Server)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Devpi server and client
- Docker and Docker Compose
- Python packaging with pyproject.toml
- pip configuration and requirements files
- Twine package uploads
- GitHub Actions service containers

## Sources Consulted
- Devpi quickstart: PyPI mirror and root/pypi cache: https://devpi.net/docs/devpi/devpi/stable/+doc/quickstart-pypimirror.html
- Devpi quickstart: user, index, and upload workflow: https://devpi.net/docs/devpi/devpi/stable/+doc/quickstart-releaseprocess.html
- Devpi user manual: indices, bases, volatile indexes, and root/pypi: https://devpi.net/docs/devpi/devpi/stable/+doc/userman/devpi_indices.html
- Devpi command reference: devpi-server, devpi-init, devpi login, devpi upload, and devpi list options: https://devpi.net/docs/devpi/devpi/stable/+doc/userman/devpi_commands.html
- Devpi server status endpoint documentation: https://devpi.net/docs/devpi/devpi/stable/+doc/adminman/server-status.html
- pip configuration documentation: https://pip.pypa.io/en/stable/topics/configuration/
- pip requirements file format documentation: https://pip.pypa.io/en/stable/reference/requirements-file-format/
- Python Packaging User Guide: writing pyproject.toml and setuptools backend examples: https://packaging.python.org/en/latest/guides/writing-pyproject-toml/
- Docker build variables documentation: https://docs.docker.com/build/building/variables/
- GitHub Actions service containers documentation: https://docs.github.com/actions/guides/about-service-containers
- Twine upload documentation: https://twine.readthedocs.io/en/stable/
- Docker Hub page for muccg/devpi image metadata: https://hub.docker.com/r/muccg/devpi

## Issues Found
- The Docker Compose healthcheck used `wget`, which is not guaranteed to exist in Python-based container images. Changed it to a Python standard-library `urllib.request` healthcheck against `http://localhost:3141/+api`.
- The custom Dockerfile initialized `/data` during image build. A runtime named volume mounted at `/data` would hide that initialized directory, so a fresh container could start with an uninitialized server directory. Changed the image command to run `devpi-init --serverdir /data --root-passwd "$DEVPI_PASSWORD"` on first startup when `/data/.serverversion` is absent, then execute `devpi-server`.
- The custom image run command did not pass `DEVPI_PASSWORD`, even though the initial configuration logs in as root with `admin_password`. Added `-e DEVPI_PASSWORD=admin_password`.
- The example `pyproject.toml` used `setuptools.backends._legacy:_Backend`, which is not the standard public setuptools backend for modern `pyproject.toml` projects. Changed it to `setuptools.build_meta`.
- The Docker build example used `--network=host` while passing `http://devpi:3141/...` as the index URL. With host networking, the published Devpi service should be addressed through `localhost`. Changed the build args to `http://localhost:3141/...` and `PIP_TRUSTED_HOST=localhost`.

## Review Notes
- The post's Devpi index inheritance explanation, `root/pypi/+simple/` pip URLs, `devpi user`, `devpi index`, `devpi login`, `devpi upload`, `pip config`, requirements file options, Twine upload pattern, and GitHub Actions localhost service access are consistent with the consulted documentation.
- The referenced `muccg/devpi:latest` community image is very old on Docker Hub and contains an old Devpi release. The post now includes a corrected custom image path for current package installs, but future revisions should consider replacing the community image examples with a maintained image or the custom image throughout.
