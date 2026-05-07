# Validation Summary: How to Use ONBUILD Instruction in Containerfiles for Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Buildah
- Containerfiles / Dockerfile syntax
- ONBUILD
- Node.js and npm
- Python, Poetry, pytest, and Pylint
- Go

## Sources Consulted
- Podman build documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman image inspect documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Dockerfile reference for `ONBUILD`: https://docs.docker.com/reference/dockerfile/
- Buildah official source for OCI-format `ONBUILD` warning behavior: https://raw.githubusercontent.com/containers/buildah/main/config.go
- Buildah ONBUILD article: https://buildah.io/blogs/2018/10/09/buildah-blocks-on-build.html
- npm `ci` documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci
- pytest command-line reference: https://docs.pytest.org/en/stable/reference/reference.html
- Pylint usage documentation: https://pylint.readthedocs.io/en/v3.0.4/user_guide/usage/run.html

## Issues Found
- The post said `ONBUILD` can wrap any valid Containerfile instruction. I corrected this because official Dockerfile documentation excludes `FROM`, `MAINTAINER`, and chained `ONBUILD`.
- The OCI-format section said `ONBUILD` triggers are silently ignored. I corrected this to warn-and-ignore behavior, which matches Buildah's documented and implemented behavior for OCI-format images.
- The Node.js example implied any project could use `npm ci`. I clarified that this example requires `package-lock.json`, because official npm documentation states `npm ci` requires an existing lockfile.
- The ONBUILD inspection commands used generic `podman inspect`. I changed them to `podman image inspect` so the commands explicitly target image metadata.
- The Go example used `ONBUILD COPY --from=builder` from a stage defined in the base image. That does not work as written when the trigger fires in a child build, so I replaced it with a valid example and corrected the multi-stage explanation.
- The validation example for Node.js used `npm ci` without ensuring `package-lock.json` was present. I updated it to validate that requirement explicitly.
- The Python lint example used `**/*.py`, which is not reliable under the default `/bin/sh` used by these images. I replaced it with a `find ... -exec pylint ...` form that works as described.
- The limitations section claimed only two instructions could not be used with `ONBUILD`. I corrected it to include `ONBUILD MAINTAINER`.

## Review Notes
- Podman and Buildah are not installed in this workspace, so command behavior was validated against official documentation and Buildah source rather than local execution.
- The versioned base image tags in the examples were syntactically valid at review time, but they will age over time and may need future refreshes.
