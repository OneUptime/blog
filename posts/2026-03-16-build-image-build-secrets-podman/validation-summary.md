# Validation Summary: How to Build an Image with Build Secrets with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containerfile / Dockerfile syntax
- Container image builds
- Build secrets
- npm
- Go modules
- Git authentication

## Sources Consulted
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman `podman history` documentation: https://docs.podman.io/en/latest/markdown/podman-history.1.html
- npm `npm ci` documentation: https://docs.npmjs.com/cli/v8/commands/npm-ci/
- Go modules reference: https://go.dev/ref/mod
- Git `git-config` documentation: https://git-scm.com/docs/git-config

## Issues Found
- The Node.js multiple-secrets example ran `npm ci` before copying `package.json` and the lockfile into the image. Added `COPY package*.json ./` before the secret-mounted `RUN` instruction so `npm ci` has the required project files.
- The custom mount path example mounted a secret under `/etc/myapp/config.json` without first creating `/etc/myapp`. Added `RUN mkdir -p /etc/myapp` before the secret mount.
- The environment variable example described passing an environment variable as a secret but wrote the value to a temporary file first. Updated it to use Podman's documented `--secret id=my_secret,env=MY_SECRET` syntax.
- The Go private module example configured credentials in one layer and ran `go mod download` in a later layer, which could persist token-bearing Git and `.netrc` files in an intermediate build layer. Moved `go mod download` into the same secret-mounted `RUN`, added `GOPRIVATE`, and removed the temporary credential files/configuration before the layer is committed.

## Review Notes
The core Podman claims are accurate: `podman build --secret` supports file and environment sources, secrets are consumed with `RUN --mount=type=secret`, the default mount location is `/run/secrets/<id>`, and `target` can override the mount path. The post's `podman history --no-trunc` verification command matches official Podman documentation, although the local environment did not have `podman` installed for live execution.
