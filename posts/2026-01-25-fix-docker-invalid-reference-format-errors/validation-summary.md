# Validation Summary: How to Fix Docker 'Invalid Reference Format' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker image references
- Docker CLI
- Docker Compose variable interpolation
- Bash scripting
- GitHub Actions
- GitLab CI
- PowerShell path syntax for Docker volume mounts

## Sources Consulted
- Docker CLI reference for `docker image pull`: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker CLI reference for `docker image tag`: https://docs.docker.com/reference/cli/docker/image/tag/
- Docker Compose interpolation reference: https://docs.docker.com/reference/compose-file/interpolation/
- Distribution reference package grammar: https://pkg.go.dev/github.com/distribution/reference
- Docker image tag manual page generated from Docker CLI docs: https://man.archlinux.org/man/docker-image-tag.1.en
- Local Docker CLI help output for `docker image pull` and `docker compose config`

## Issues Found
- The image reference pattern used `[:tag|@digest]`, which incorrectly implied tag and digest are mutually exclusive. Updated it to `[:tag][@digest]` to match the canonical grammar.
- The digest example used an ellipsis and was not a literal valid reference. Replaced it with a full `sha256` digest.
- The trailing-whitespace example used `docker pull $IMAGE` unquoted, which shell word splitting can trim before Docker sees it. Quoted the variable so the example demonstrates the actual invalid reference.
- The file-reading example said command substitution preserves a trailing newline, but shell command substitution removes trailing newlines. Updated the example to cover carriage returns from Windows-formatted files and embedded newline cleanup.
- The repository-name regex was too narrow because Docker allows one or two underscores and runs of dashes as separators. Updated the displayed repository component pattern.
- The Bash validation regex rejected valid references with registry ports and accepted invalid tags starting with `-`. Replaced it with more accurate checks for digest, tag, registry hostname, repository path components, and repository length.

## Review Notes
The article is technically relevant and current. The Bash validator remains a practical preflight check rather than a full replacement for Docker's own parser, but it now aligns with the documented reference grammar for the cases shown in the guide.
