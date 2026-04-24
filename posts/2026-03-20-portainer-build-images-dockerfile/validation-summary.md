# Validation Summary: How to Build Docker Images from a Dockerfile in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker
- Dockerfile
- Node.js
- Python / FastAPI
- Go
- npm

## Sources Consulted
- Portainer official documentation, "Build a new image": https://docs.portainer.io/user/docker/images/build
- Portainer official documentation, "Add a new container": https://docs.portainer.io/sts/user/docker/containers/add
- Portainer official source, build image mutation schema (`buildargs`): https://github.com/portainer/portainer/blob/develop/app/react/docker/images/queries/useBuildImageMutation.ts
- Docker official Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker official `docker image prune` reference: https://docs.docker.com/reference/cli/docker/image/prune/
- npm official `npm ci` documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- npm official config documentation (`only` deprecation): https://docs.npmjs.com/cli/v10/using-npm/config/

## Issues Found
1. **Portainer upload workflow was described incorrectly**: The post said Portainer's upload option accepts a zip or tar build context. Current Portainer documentation describes the upload method as uploading a Dockerfile directly, while tarballs and public GitHub repositories are handled through the URL-based workflow. I corrected the upload section to match Portainer's documented behavior.
2. **Web editor example omitted required build-context guidance**: The web-editor example used `COPY` instructions but did not explain that Portainer requires users to add local files explicitly with **Select files** when building this way. I added that note so the example matches how Portainer handles local context files.
3. **`PYTHON_VERSION` build argument would not have affected `FROM`**: The Dockerfile example referenced `${PYTHON_VERSION:-3.12}` in the `FROM` line before declaring `ARG PYTHON_VERSION`. Per Docker's Dockerfile reference, an `ARG` must be declared before the first `FROM` to influence it. I added `ARG PYTHON_VERSION=3.12` before `FROM`.
4. **Deprecated npm flag in Node.js examples**: The post used `npm ci --only=production`. Current npm docs mark `only=production` as deprecated in favor of `--omit=dev`. I updated both Node.js Dockerfile examples accordingly.

## Review Notes
- Portainer's current documentation notes that in multi-node environments, a newly built image is only available on the node selected during the build unless you use a registry. The post remains accurate for single-node or node-local workflows but could mention this in a future revision.
