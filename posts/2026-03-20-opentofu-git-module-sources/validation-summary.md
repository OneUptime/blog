# Validation Summary: How to Use Git Repository Module Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (module sources)
- Git (tags, refs, branches, commits)
- HCL (HashiCorp Configuration Language)
- SSH authentication (ssh-agent, ssh-add)
- Git credential helpers
- GitHub authentication (HTTPS tokens, SSH deploy keys)

## Sources Consulted
- OpenTofu Module Sources documentation: https://opentofu.org/docs/language/modules/sources/
- Terraform/OpenTofu go-getter Git source semantics
- Git documentation for `credential.helper`, `url.<base>.insteadOf`, and SSH agent usage

## Issues Found
No technical issues found.

The post correctly describes:
- The `git::` prefix for Git module sources
- The `//` subdirectory separator and its required position before query parameters
- The `?ref=` parameter accepting tags, branches, and commit hashes (matching `git checkout` semantics)
- HTTPS URL format (`git::https://...`)
- SSH scp-like URL format (`git::git@github.com:org/repo.git`)
- Authentication via Git credential helper, SSH agent, and `url.insteadOf` rewrites in CI
- `tofu init` as the command to fetch/cache modules

## Review Notes
- The `GIT_ASKPASS` environment variable is mentioned alongside `GIT_TERMINAL_PROMPT=0`. `GIT_ASKPASS` actually expects a path to a helper program, not a value — so the phrasing "set the GIT_ASKPASS … environment variables" is slightly imprecise, though not strictly incorrect. Left unchanged since it isn't a functional error and the surrounding text recommends `credential.helper` and `GITHUB_TOKEN` which are the practical mechanisms.
- The branch example uses `?ref=feature/my-feature`. Branch names containing slashes work in practice with go-getter without URL-encoding, so this is accurate.
- The post correctly recommends pinning to tags or commit hashes in production rather than mutable branch refs.
