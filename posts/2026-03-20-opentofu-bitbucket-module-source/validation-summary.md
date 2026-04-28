# Validation Summary: Using Bitbucket as a Module Source in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (module sources)
- Terraform (module sources, compatible syntax)
- Bitbucket Cloud (bitbucket.org)
- Git (HTTPS / SSH remotes, credential.helper store)
- SSH key generation (ed25519)

## Sources Consulted
- OpenTofu Module Sources documentation: https://opentofu.org/docs/language/modules/sources/
- OpenTofu Bitbucket section: https://opentofu.org/docs/language/modules/sources/#bitbucket
- Terraform Module Sources documentation (for cross-reference): https://developer.hashicorp.com/terraform/language/modules/sources
- Git documentation for `credential.helper store` and `~/.git-credentials` format
- Bitbucket Cloud documentation for SSH and HTTPS remote URL formats

## Issues Found
- **Missing limitation about the `bitbucket.org` shorthand only working for public repositories.** The official OpenTofu docs explicitly state: "This shorthand works only for public repositories, because OpenTofu must access the BitBucket API to learn if the given repository uses Git or Mercurial." The original post implied the shorthand could be used together with the "Authentication for Private Repositories" section, which is incorrect — for private repos you must use the full `git::` URL form. Added a clarifying sentence after the introduction explaining the public-only restriction and pointing readers to the `git::` URL form for private repos.

## Review Notes
- The HCL `source` strings, including subdirectory delimiter `//` and the `?ref=` query parameter for refs/tags, match OpenTofu's go-getter URL syntax.
- The full Git URL examples (`git::https://...` and `git::ssh://git@bitbucket.org/...`) are correctly formatted. The SSH form correctly uses a `/` between the host and the workspace path (because `ssh://` URL form is being used rather than the SCP-like `git@host:path` form).
- The `git config --global credential.helper store` and `~/.git-credentials` line format (`https://username:app-password@bitbucket.org`) match Git's documented behavior for the store helper.
- Bitbucket app passwords are the documented way to authenticate over HTTPS for automation; this is current.
- The "Practical Example with Version Tags" still uses the shorthand for `mycompany/tf-modules`, which is fine as long as the reader has understood the public-only caveat now placed at the top of the post.
- Bitbucket dropped Mercurial support several years ago, so in practice the API check almost always resolves to Git, but the shorthand still relies on the API call and therefore still requires a public repo — so the OpenTofu limitation remains in effect.
