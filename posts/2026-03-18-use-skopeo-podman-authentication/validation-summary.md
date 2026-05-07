# Validation Summary: How to Use Skopeo with Podman Authentication

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Skopeo
- Buildah
- Container registry authentication
- Amazon ECR
- GitHub Container Registry (GHCR)
- GitLab Container Registry

## Sources Consulted
- Podman login documentation: https://docs.podman.io/en/latest/markdown/podman-login.1.html
- Podman logout documentation: https://docs.podman.io/en/latest/markdown/podman-logout.1.html
- Podman pull documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- containers-auth.json man page (upstream containers/image): https://raw.githubusercontent.com/containers/image/main/docs/containers-auth.json.5.md
- Skopeo inspect man page: https://raw.githubusercontent.com/containers/skopeo/main/docs/skopeo-inspect.1.md
- Skopeo copy man page: https://raw.githubusercontent.com/containers/skopeo/main/docs/skopeo-copy.1.md
- Skopeo list-tags man page: https://raw.githubusercontent.com/containers/skopeo/main/docs/skopeo-list-tags.1.md
- Skopeo README auth section: https://raw.githubusercontent.com/containers/skopeo/main/README.md
- AWS ECR Podman guide: https://docs.aws.amazon.com/AmazonECR/latest/userguide/Podman.html
- AWS CLI `get-login-password` reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- GitHub Container registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitLab container registry authentication documentation: https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/

## Issues Found
- The post described `~/.config/containers/auth.json` as the Linux fallback in a way that implied a single shared file. I updated the explanation to reflect the actual primary auth file and credential search order documented in `containers-auth.json(5)` and Podman.
- Several examples hard-coded `~/.config/containers/auth.json` for inspection and troubleshooting. I updated them to use the primary auth file path variable and match the documented lookup behavior.
- The `jq 'keys'` example did not list stored registry credentials; it only listed top-level JSON keys. I changed it to `jq '.auths | keys'`.
- The AWS ECR example used a nonstandard 9-digit placeholder account ID. I updated it to a 12-digit AWS account ID placeholder format.
- The GitHub Container Registry example said “personal access token” but used `GITHUB_TOKEN`, which is ambiguous relative to GitHub’s current documentation. I updated it to a personal access token (classic) variable.
- The GitLab deploy-token example used a literal username placeholder and `--password` on the command line. I updated it to use a username variable and `--password-stdin`, which matches GitLab’s authentication guidance.
- The CI example pre-created an auth file. I updated it to create a temporary directory and let `podman login` create `auth.json`, and I switched it to `--password-stdin`.

## Review Notes
- Podman’s default Linux auth file under `${XDG_RUNTIME_DIR}` is ephemeral and may not persist across reboot or logout. Readers who need persistence should explicitly use `--authfile ~/.config/containers/auth.json` or `REGISTRY_AUTH_FILE`.
- No deprecated Skopeo or Podman auth flags were found in the reviewed examples after correction.
- Local `podman` and `skopeo` binaries were not available in the workspace, so CLI behavior was validated against upstream man pages and vendor documentation rather than live command output.
