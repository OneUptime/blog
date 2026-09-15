# Validation Summary: How to Write a Custom Drone Plugin and Map Settings to `PLUGIN_*` Environment Variables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Drone CI Docker pipelines and plugins
- Docker and Dockerfiles
- Python 3.13
- Python `pathlib` and `hashlib`
- SHA-256 checksums
- YAML pipeline configuration

## Sources Consulted
- Drone Example Bash Plugin: https://docs.drone.io/plugins/tutorials/bash/
- Drone Docker Pipeline Plugins: https://docs.drone.io/pipeline/docker/syntax/plugins/
- Drone Docker Pipeline Steps: https://docs.drone.io/pipeline/docker/syntax/steps/
- Drone Docker Pipeline Workspace: https://docs.drone.io/pipeline/docker/syntax/workspace/
- Drone `DRONE_WORKSPACE` Environment Variable: https://docs.drone.io/pipeline/environment/reference/drone-workspace/
- Python 3.13 `pathlib` Documentation: https://docs.python.org/3.13/library/pathlib.html
- Python `hashlib` Documentation: https://docs.python.org/3/library/hashlib.html
- Docker Bind Mount Documentation: https://docs.docker.com/engine/storage/bind-mounts/
- Dockerfile Reference: https://docs.docker.com/reference/dockerfile/
- Docker Official Python Image Tags: https://hub.docker.com/_/python/tags?name=3.13
- Docker Official Alpine Image: https://hub.docker.com/_/alpine

## Issues Found
- The post described a version reference as inherently immutable, but a normal image tag can be moved. Changed the guidance to distinguish a versioned tag protected by registry immutability policy from an image digest.

## Review Notes
- The Python example is valid for Python 3.13. Resolving both the workspace and target before calling `is_relative_to()` correctly rejects `..` traversal and symlinks that resolve outside the workspace during validation.
- The numeric non-root user is valid Dockerfile syntax, but successful reads still depend on workspace file and directory permissions, as the post notes.
- `alpine:3.22` and `python:3.13-alpine` are valid image tags as of the validation date. The post appropriately recommends using a reviewed digest for releases.
- The shown `docker build`, `docker run --mount`, Drone YAML, `settings` mapping, `from_secret` syntax, and warning about `commands` overriding the image entrypoint agree with the official documentation.
