# Validation Summary: How to Fix Authentication Errors with Podman Registries

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Podman
- Container registries
- Docker Hub
- GitHub Container Registry
- Amazon Elastic Container Registry
- containers/auth.json
- containers/registries.conf
- Docker credential helpers
- TLS certificates for private registries

## Sources Consulted
- Podman `podman-login` documentation: https://docs.podman.io/en/v5.6.0/markdown/podman-login.1.html
- Podman `podman-info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman-logout` documentation: https://docs.podman.io/en/latest/markdown/podman-logout.1.html
- Podman `podman-pull` documentation: https://www.mankier.com/1/podman-pull
- containers-auth.json documentation: https://github.com/containers/image/blob/main/docs/containers-auth.json.5.md
- containers-registries.conf documentation: https://github.com/containers/image/blob/main/docs/containers-registries.conf.5.md
- containers-certs.d documentation: https://man.archlinux.org/man/containers-certs.d.5.en
- Docker Hub pull usage and limits: https://docs.docker.com/docker-hub/usage/pulls/
- Docker Hub access tokens: https://docs.docker.com/docker-hub/access-tokens/
- GitHub Container Registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- AWS ECR `get-login-password` documentation: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- AWS ECR with Podman documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/Podman.html

## Issues Found
- Corrected the default Podman authentication file location. Current Podman/container-auth documentation describes the Linux primary read/write auth file as `${XDG_RUNTIME_DIR}/containers/auth.json`; the post incorrectly listed `/run/containers/0/auth.json` for rootful use.
- Clarified auth file lookup locations. Podman can read the persistent containers auth file and Docker-compatible config, not only two locations.
- Updated Docker Hub rate-limit wording. Docker Personal authenticated users have a 200-pull-per-6-hours limit, while Pro, Team, and Business users are not subject to that 6-hour pull limit.
- Changed the self-signed registry wording from "trust" to "allow insecure connections" for `insecure = true`, because that setting permits HTTP or TLS with untrusted certificates rather than installing trust.
- Fixed the credential helper section. Podman supports `credHelpers`, but AWS documents that Podman does not support Docker's global `credsStore` keyword.
- Narrowed the GitHub Container Registry claim. A classic PAT with `read:packages` is required for pulling private packages, while public packages can be accessed anonymously.
- Fixed the `podman info` Go template for search registries. `.Registries` is a map, so the correct template uses `index .Registries "search"`.

## Review Notes
Podman was not installed in the local environment, so CLI flags and examples were verified against official documentation rather than local `--help` output.
