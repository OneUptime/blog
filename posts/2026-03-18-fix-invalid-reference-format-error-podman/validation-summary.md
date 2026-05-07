# Validation Summary: How to Fix 'Error: invalid reference format' in Podman

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- Docker-compatible container image references
- Docker Compose / Podman Compose YAML
- Bash shell scripting
- GitHub Actions
- GitLab CI/CD

## Sources Consulted
- Podman `podman pull` documentation: https://docs.podman.io/en/latest/markdown/podman-pull.1.html
- Podman `podman run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Docker `docker image tag` documentation: https://docs.docker.com/reference/cli/docker/image/tag/
- Distribution reference package grammar, linked by Docker as the canonical image reference definition: https://pkg.go.dev/github.com/distribution/reference
- Docker Compose interpolation documentation: https://docs.docker.com/reference/compose-file/interpolation/
- GitHub Actions variables documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/variables
- GitLab predefined CI/CD variables documentation: https://docs.gitlab.com/ci/variables/predefined_variables/

## Issues Found
- The image-reference overview incorrectly said a reference can contain only a single forward slash for namespacing. Updated it to describe slash-separated registry, namespace, and repository path components.
- The valid digest example used an ellipsis instead of a valid digest value. Replaced it with a 64-character hexadecimal `sha256` digest.
- The post attributed lowercase image-name rules to the OCI specification and implied tags must be lowercase. Updated the wording to say repository names must be lowercase while tags may contain uppercase letters.
- The shell variable example showed quoting a tag containing a space as the fix, but a tag with a space is still invalid. Updated the corrected example to sanitize the tag value and quote it.
- The file-reading whitespace example implied command substitution preserves a trailing newline from `cat`. Updated the wording to focus on trailing spaces and embedded newlines.
- The digest section implied all digests must be SHA256 hashes. Updated it to say that `sha256` references require a 64-character SHA256 hash.
- The manual validation regex was too broad in some places and too narrow in others. Updated the comment to identify it as a simple `repository[:tag]` pattern and corrected the tag start character.
- The validation helper rejected uppercase letters anywhere in the full reference, which would reject valid uppercase tags. Updated it to check only the repository name portion.

## Review Notes
Podman is not installed in the local environment, so Podman-specific behavior was checked against official Podman documentation. Docker CLI 29.4.2 was available locally and was used for spot checks of Docker-compatible reference parsing, including lowercase repository enforcement and uppercase tag acceptance.
