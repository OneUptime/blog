# Validation Summary: How to Set Up a Python Development Environment with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker bind mounts and volumes
- Python 3.12
- FastAPI
- Uvicorn
- debugpy
- Visual Studio Code Python debugging
- pytest

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, `docker container exec`: https://docs.docker.com/reference/cli/docker/container/exec/
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer Docs, How Relative Path Support works in Portainer: https://docs.portainer.io/advanced/relative-paths
- FastAPI Docs, First Steps: https://fastapi.tiangolo.com/tutorial/first-steps/
- Uvicorn Docs, Settings: https://www.uvicorn.org/settings/
- VS Code Docs, Python debugging: https://code.visualstudio.com/docs/python/debugging
- VS Code Docs, Use Docker Compose: https://code.visualstudio.com/docs/containers/docker-compose
- debugpy FAQ: https://github.com/microsoft/debugpy/wiki/FAQ

## Issues Found
- The Compose snippet used the top-level `version: "3.8"` field. Docker now treats the `version` field as obsolete under the Compose Specification, so I removed it to keep the example current.
- The VS Code attach example used `"type": "python"` with a nested `connect` object. Current VS Code Python debugging docs use the Python Debugger / `debugpy` adapter, so I updated the example to `"type": "debugpy"` with top-level `host` and `port`.
- The post implied that editing `./src` would always trigger hot-reload in Portainer. Portainer's relative path support is not universal; relative paths like `./src` depend on Portainer's Relative path volumes workflow, otherwise an absolute host path is needed. I clarified the volume comment and the hot-reload explanation to reflect that behavior.
- The testing section labeled a shell snippet as "docker exec" even though it was only a command to run after entering the container shell. I corrected the wording so the command matches the context shown.

## Review Notes
- The `python -m debugpy --listen 0.0.0.0:5678` pattern is valid, but publishing `5678:5678` exposes the debugger outside the container. VS Code's docs recommend taking appropriate security precautions when debugging over a non-localhost listener.
- Installing dependencies with `pip install -r requirements.txt` on every container start is workable for a lightweight development setup, but it increases startup time compared with baking dependencies into an image.
