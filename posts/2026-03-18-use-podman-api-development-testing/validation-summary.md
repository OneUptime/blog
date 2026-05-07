# Validation Summary: How to Use Podman for API Development and Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Node.js
- Express
- FastAPI
- Pydantic
- SQLAlchemy
- PostgreSQL
- pytest
- k6
- Swagger UI
- Bash

## Sources Consulted
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman create documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman pod create documentation: https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- Podman pod rm documentation: https://docs.podman.io/en/v4.4/markdown/podman-pod-rm.1.html
- Express 5 migration guide: https://expressjs.com/en/guide/migrating-5.html
- Pydantic configuration docs: https://pydantic.dev/docs/validation/2.12/concepts/config
- Pydantic models docs: https://pydantic.dev/docs/validation/latest/concepts/models/
- Uvicorn settings: https://www.uvicorn.org/settings/
- FastAPI response status code docs: https://fastapi.tiangolo.com/tutorial/response-status-code/
- SQLAlchemy metadata tutorial: https://docs.sqlalchemy.org/20/tutorial/metadata.html
- Grafana k6 install docs: https://grafana.com/docs/k6/latest/set-up/install-k6/
- Grafana k6 scenarios docs: https://grafana.com/docs/k6/latest/using-k6/scenarios/
- Swagger UI Docker installation docs: https://swagger.io/docs/open-source-tools/swagger-ui/usage/installation/
- GNU Bash manual (`set -e` / `errexit`): https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html

## Issues Found
- The Node.js `Containerfile` and live-reload run command were inconsistent with the `api/` directory structure shown in the post. I updated the `COPY` paths to `api/...` and added a separate `api-node_modules` volume so the bind mount does not hide container-installed dependencies.
- The Podman pod example mixed the earlier Node image on port `3000` with the FastAPI example that actually serves on port `8000`. I changed the example to build and run a dedicated `my-python-api` image, publish port `8000`, and wait for PostgreSQL readiness with `pg_isready` instead of a fixed `sleep 5`.
- The FastAPI response model used the deprecated Pydantic v1-style inner `Config` class. I replaced it with `model_config = ConfigDict(from_attributes=True)` to match current Pydantic v2 guidance.
- The integration-test shell script used `set -e` but tried to capture the `pytest` exit code afterward, which would skip cleanup on failures. It also never started the API process the tests were calling. I rewrote the script to build the FastAPI image, run both API and PostgreSQL in a disposable pod, wait for readiness, and clean up with a `trap`.
- The mock-server catch-all route used `app.all('*', ...)`, which is not valid Express 5 wildcard syntax. I updated it to `app.all('/{*path}', ...)`.

## Review Notes
- `uvicorn --reload` is appropriate for the development and testing workflows described here, but it remains a development-only setting rather than a production entrypoint.
- The examples now consistently assume the application source and dependency manifests live under the `api/` directory, matching the snippet paths used throughout the post.
