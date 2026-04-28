# Validation Summary: Using Git as a Module Source in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu
- Terraform (compatible module source syntax)
- Git (HTTPS and SSH protocols)
- HCL (HashiCorp Configuration Language)
- SSH agent / `~/.ssh/config`
- Git credential helper

## Sources Consulted
- OpenTofu module sources documentation: https://opentofu.org/docs/language/modules/sources/#generic-git-repository
- Terraform module sources (compatible reference): https://developer.hashicorp.com/terraform/language/modules/sources#generic-git-repository
- Git documentation on credentials: https://git-scm.com/docs/gitcredentials
- Git credential store helper: https://git-scm.com/docs/git-credential-store
- OpenSSH `ssh_config` man page for `IdentityFile` directive

## Issues Found
- **`GIT_CREDENTIALS` environment variable reference (line 64 originally):** The post mentioned setting `GIT_CREDENTIALS` for HTTPS authentication. This is not a standard Git environment variable. The actual mechanisms Git provides are credential helpers (e.g. `git config credential.helper store`) which read from `~/.git-credentials`, or `GIT_ASKPASS`. Updated the comment to recommend configuring a credential helper that uses `~/.git-credentials`, which is the correct and supported approach.

All other technical content was verified accurate:
- `git::https://...` and `git::ssh://git@host/...` source URL prefixes are the documented OpenTofu syntax for generic Git sources.
- The `?ref=` query parameter correctly supports tags, branches, and commit SHAs as documented.
- The `//subdirectory` double-slash notation for selecting a subdirectory inside a repository is correct.
- The SSH agent (`ssh-add`) and `~/.ssh/config` `IdentityFile` instructions are valid OpenSSH practice.

## Review Notes
- The post is brief and focused; it correctly highlights production guidance (prefer tags, avoid floating branches like `main`).
- A minor future improvement could be mentioning that OpenTofu also supports `depth=N` for shallow clones via the `depth` query parameter, which can speed up CI runs for large module repos. Not strictly needed for correctness.
- The recommendation to use commit SHAs as "most precise" is accurate; a short SHA like `a1b2c3d4` will work but full 40-character SHAs are preferred for unambiguous pinning. Not technically wrong, just worth noting.
- For SSH on GitHub specifically, users may also need to ensure `github.com` is in `~/.ssh/known_hosts` to avoid host key prompts in non-interactive environments — outside the scope of this post.
