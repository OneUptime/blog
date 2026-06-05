# Validation Summary: How to Use Environment Variables as Context Propagation Carriers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry context propagation
- W3C Trace Context (`traceparent`, `tracestate`)
- Python OpenTelemetry API
- Python subprocess environment handling
- Bash environment variable export
- GitHub Actions environment files
- Docker, Docker Compose, and Docker SDK for Python

## Sources Consulted
- OpenTelemetry Propagators API: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Python `opentelemetry.propagators.textmap` API: https://opentelemetry-python.readthedocs.io/en/latest/api/propagators.textmap.html
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- Python `subprocess` documentation: https://docs.python.org/3/library/subprocess.html
- GitHub Actions workflow commands and `GITHUB_ENV`: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- Dockerfile `ARG` reference: https://docs.docker.com/reference/builder/#arg
- Docker Compose environment variables documentation: https://docs.docker.com/compose/environment-variables/
- Docker Compose top-level `version` documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker SDK for Python container API: https://docker-py.readthedocs.io/en/stable/containers.html
- Docker `container run` CLI reference: https://docs.docker.com/reference/cli/docker/container/run/

## Issues Found
- The Python OpenTelemetry examples used a custom carrier object with `get`, `set`, and `keys` methods, but OpenTelemetry Python expects custom access through separate `Getter` and `Setter` objects with `get(carrier, key)`, `keys(carrier)`, and `set(carrier, key, value)` signatures. Updated the parent and child examples to use `EnvVarSetter` and `EnvVarGetter` with the documented API.
- The Docker SDK example reused the incorrect carrier wrapper. Updated it to use the same documented `Setter` pattern and included the helper class in the snippet.
- The GitHub Actions Docker build comment said the build process and subprocesses inherit `TRACEPARENT`. Docker build arguments are only available after a matching `ARG` declaration in the Dockerfile, so the comment was corrected.
- The Docker Compose example included `version: "3.8"`, which is obsolete in the current Compose Specification and may emit a warning. Removed the top-level `version`.
- The key-mapping helper included a stray `self` parameter in standalone functions. Removed it.
- The key-mapping explanation used `baggage` as an example of a hyphenated key even though `baggage` is not hyphenated. Reworded the example to refer to custom vendor headers.

## Review Notes
The post is technically sound after the fixes. The GitHub Actions example generates a valid W3C-shaped context for downstream work, but a real root pipeline span would require an instrumented step or exporter; the generated context alone only provides a parent context for later spans.
