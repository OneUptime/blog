# Validation Summary: How to Build Minimal Docker Images with Distroless

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker and Dockerfiles
- Google Distroless container images
- Go
- Node.js and Express
- Python, Flask, and Gunicorn
- Kubernetes ephemeral debug containers
- Trivy vulnerability scanning

## Sources Consulted
- GoogleContainerTools distroless README: https://github.com/GoogleContainerTools/distroless
- Distroless Node.js documentation: https://github.com/GoogleContainerTools/distroless/blob/main/nodejs/README.md
- Distroless Python documentation: https://github.com/GoogleContainerTools/distroless/blob/main/python3/README.md
- Distroless Python requirements example: https://github.com/GoogleContainerTools/distroless/blob/main/examples/python3-requirements/Dockerfile
- Docker multi-stage builds documentation: https://docs.docker.com/build/building/multi-stage/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- npm ci documentation: https://docs.npmjs.com/cli/v9/commands/npm-ci/
- Node.js releases documentation: https://nodejs.org/en/about/previous-releases
- Go downloads and release notes: https://go.dev/dl/ and https://go.dev/doc/go1.26
- Go net/http package documentation: https://pkg.go.dev/net/http
- Express API reference: https://expressjs.com/en/api/
- Flask development server and deployment documentation: https://flask.palletsprojects.com/en/stable/server/ and https://flask.palletsprojects.com/en/stable/deploying/gunicorn/
- Kubernetes debug running pods documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Trivy image command documentation: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/

## Issues Found
- The post described distroless images as generally including a non-root user and showed "Non-root by Default" as a blanket security benefit. Updated the wording to clarify that non-root execution is provided by the `:nonroot` tags.
- The image table and examples used unsuffixed or outdated distroless tags, including Node.js 20. Updated examples to Debian 13-suffixed images and Node.js 24, matching currently published distroless variants.
- The Go builder image used Go 1.22, which is no longer the current supported Go line. Updated it to `golang:1.26-alpine`.
- The Node.js Dockerfile used `npm ci --only=production`. Updated it to the current documented `npm ci --omit=dev` form.
- The Python Dockerfile used `python:3.11-slim` with current distroless Python, which can create ABI and virtualenv path mismatches. Updated it to `python:3.13-slim-trixie` and added the `/usr/bin/python` symlink recommended by the distroless Python documentation.
- The Python container command ran Flask's built-in development server. Updated the Dockerfile to run the app with Gunicorn for a production-oriented container.
- The debug image example used an unsuffixed distroless tag. Updated it to `gcr.io/distroless/static-debian13:debug`.
- The CVE comparison implied a distroless image would always scan with zero vulnerabilities. Changed the example to state that exact scanner results vary over time.

## Review Notes
- JavaScript and Python snippets were syntax-checked locally. The local environment does not have the Go toolchain installed, so the Go snippet was reviewed against official Go documentation rather than compiled locally.
