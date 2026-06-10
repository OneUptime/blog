# Validation Summary: How to Build Docker Images in CircleCI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CircleCI (version 2.1 config syntax)
- Docker / Dockerfile
- Docker Buildx (multi-architecture builds)
- Docker layer caching (DLC)
- CircleCI orbs (`circleci/docker@2.2.0`, `circleci/aws-ecr@8.2.1`)
- Trivy (vulnerability scanning)
- Hadolint (Dockerfile linting)
- Container registries: Docker Hub, Amazon ECR, Google Artifact Registry
- QEMU (cross-platform emulation)
- Node.js / npm (in example Dockerfile)
- Mermaid diagrams

## Sources Consulted
- CircleCI configuration reference: https://circleci.com/docs/configuration-reference/
- CircleCI `setup_remote_docker` docs: https://circleci.com/docs/building-docker-images/
- CircleCI Docker Layer Caching docs: https://circleci.com/docs/docker-layer-caching/
- CircleCI built-in environment variables: https://circleci.com/docs/variables/
- CircleCI Docker orb: https://circleci.com/developer/orbs/orb/circleci/docker
- CircleCI AWS ECR orb: https://circleci.com/developer/orbs/orb/circleci/aws-ecr
- Docker Buildx documentation: https://docs.docker.com/buildx/working-with-buildx/
- Trivy install script: https://github.com/aquasecurity/trivy/blob/main/contrib/install.sh
- AWS ECR `get-login-password` docs: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Google Artifact Registry Docker auth: https://cloud.google.com/artifact-registry/docs/docker/authentication
- Hadolint documentation: https://github.com/hadolint/hadolint
- Docker BUILDKIT_INLINE_CACHE documentation: https://docs.docker.com/build/cache/backends/inline/

## Issues Found
No technical issues found.

All CircleCI configuration is syntactically valid for the 2.1 schema:
- The `setup_remote_docker` `version` parameter with `20.10.18` was a valid documented version
- The `docker_layer_caching: true` parameter is correctly used
- Built-in environment variables (`CIRCLE_SHA1`, `CIRCLE_BRANCH`, `CIRCLE_TAG`) and bash parameter expansion (`${CIRCLE_SHA1:0:7}`) are used correctly
- Orb versions referenced (`circleci/docker@2.2.0`, `circleci/aws-ecr@8.2.1`) are real, published versions
- Workflow filters with `branches.ignore`/`tags.only` regex patterns (e.g. `/^v.*/`, `/.*/`) follow CircleCI's documented syntax
- `cimg/base:stable`, `ubuntu-2204:current`, and `hadolint/hadolint:latest-debian` are valid images
- ECR authentication via `aws ecr get-login-password | docker login --username AWS --password-stdin` matches AWS's documented pattern
- Artifact Registry authentication using `_json_key` as the username with stdin-piped JSON service account key is correct
- Docker Buildx commands (`buildx create --driver docker-container --use`, `buildx inspect --bootstrap`, `buildx build --platform linux/amd64,linux/arm64 --push`) are syntactically and semantically correct
- QEMU registration via `multiarch/qemu-user-static --reset -p yes` is the documented approach
- Trivy install URL and CLI flags (`--exit-code 1`, `--severity HIGH,CRITICAL`, `--no-progress`, `--ignore-unfixed`, `--format json`, `--output`) match Trivy's documentation
- Docker commands (`docker save -o`, `docker load -i`, `docker system prune -af`, `docker volume prune -f`, `docker tag`, `docker push`) use correct flags
- `BUILDKIT_INLINE_CACHE=1` is the correct BuildKit build-arg for inline cache metadata

## Review Notes
- The example Dockerfile uses `npm ci --only=production`. This flag is legacy in npm 9+ (npm bundled with Node.js 18) and the recommended replacement is `npm ci --omit=dev`. The legacy flag still works correctly with Node 18, so this is not strictly a bug, but it could be modernized in future updates.
- The `version` parameter on `setup_remote_docker` accepts specific Docker version strings; over time CircleCI has shifted toward simpler aliases like `default` and may eventually deprecate explicit pin-by-patch versions. The value `20.10.18` shown in the post was a valid pinned version when it was added and continues to function.
- The `multiarch/qemu-user-static` image still works for cross-architecture builds; some teams prefer `tonistiigi/binfmt` today, but either is acceptable.
- The post uses `docker-compose` (hyphenated, Compose v1) in the integration-test job. The `cimg/base:stable` image typically includes a compatible binary, but Compose v2 (`docker compose` with a space) is the current upstream-supported syntax. The hyphenated form continues to work via the legacy shim on most CircleCI executors.
- Several separate YAML snippets in the post reuse the workflow name `build-and-push`. Each snippet is a standalone `config.yml` example, so this is not a conflict—just worth noting if a reader tries to combine them.
