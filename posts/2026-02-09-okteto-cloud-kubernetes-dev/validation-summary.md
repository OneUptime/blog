# Validation Summary: How to Configure Okteto for Cloud-Based Kubernetes Development Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Okteto CLI and Okteto Manifest
- Kubernetes Deployments, Services, Secrets, and Ingress
- Docker and multi-stage Dockerfiles
- Docker Compose on Okteto
- Node.js and npm
- GitHub Actions
- Helm and kubectl

## Sources Consulted
- Okteto CLI Reference: https://www.okteto.com/docs/reference/okteto-cli/
- Okteto CLI Installation: https://www.okteto.com/docs/get-started/install-okteto-cli/
- Okteto Manifest Reference: https://www.okteto.com/docs/reference/okteto-manifest/
- Okteto Docker Compose Reference: https://www.okteto.com/docs/reference/docker-compose/
- Okteto Variables: https://www.okteto.com/docs/core/okteto-variables/
- Kubernetes Ingress API v1 Reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes Ingress Concepts: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Docker Multi-stage Builds: https://docs.docker.com/build/building/multi-stage/
- npm ci Documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- Node.js Release Schedule: https://github.com/nodejs/release
- GitHub actions/checkout: https://github.com/actions/checkout
- GitHub actions/github-script: https://github.com/actions/github-script

## Issues Found
- Okteto architecture was described as directly replacing pods. Updated it to match current Okteto behavior: `okteto up` scales the selected deployment to zero and creates a mirror deployment with development-time overrides.
- The macOS install command used the older Homebrew tap form. Updated it to the current documented `brew install okteto`.
- The post used `okteto login` and `okteto login --token`, which are not in the current CLI reference. Removed the interactive login command and updated CI authentication to `okteto context use ... --token ...`.
- The Okteto manifest examples used unsupported `sync.excludes` fields. Removed those fields and used the documented basic and extended `sync` formats.
- The `okteto up` explanation said the pod is replaced. Updated the numbered list to describe scaling the original deployment to zero and creating a mirror deployment.
- The multi-service command `okteto up api worker` was invalid because `okteto up` accepts a single optional development container name. Updated the example to start another service in a separate terminal.
- GitHub Actions examples used older action versions and parsed `okteto preview list` with text tools. Updated to `actions/checkout@v4`, `actions/github-script@v9`, and `okteto preview endpoints`.
- The old `okteto stack` workflow is not present in the current CLI. Replaced it with the documented Docker Compose workflow using `docker-compose.yml`, `okteto deploy`, `okteto endpoints`, `okteto logs`, and `okteto destroy`.
- The secrets example used unsupported `dev.secrets` object syntax and an unsupported `externalSecrets` field. Replaced it with the documented `LOCAL_PATH:REMOTE_PATH:MODE` secret file format.
- The custom domain example used an unsupported top-level Okteto `ingress` block and older Kubernetes Ingress backend fields. Replaced it with a valid `networking.k8s.io/v1` Ingress and an `envsubst | kubectl apply` deploy command.
- The sync monitoring command used an unsupported `okteto up --verbose` flag. Replaced it with `okteto status --watch`.
- The force resync command used `okteto restart`, which restarts services rather than resetting file sync. Replaced it with `okteto up --reset`.
- The Dockerfile used Node.js 18, which is end-of-life as of April 30, 2025. Updated examples to Node.js 22.
- The Dockerfile used `npm ci --only=production`. Updated it to the current `npm ci --omit=dev` form.
- The service connectivity example used `curl` against a PostgreSQL port. Changed it to a TCP connectivity check with `nc -vz`.

## Review Notes
- The examples are illustrative and still assume matching Kubernetes Deployments, Services, Helm charts, package scripts, and local tooling such as `envsubst` and `nc` exist in the reader's project environment.
