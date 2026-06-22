# Validation Summary: Git Credential Storage: Cache, Store, and Manage Passwords Securely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Git credential helpers
- git-credential-cache
- git-credential-store
- macOS Keychain / git-credential-osxkeychain
- Git Credential Manager on Windows
- Linux Secret Service / libsecret
- GitHub personal access tokens
- GitHub Actions authentication
- GitLab CI job tokens
- SSH keys

## Sources Consulted
- Git gitcredentials documentation: https://git-scm.com/docs/gitcredentials
- Git git-credential-cache documentation: https://git-scm.com/docs/git-credential-cache
- Git git-credential-store documentation: https://git-scm.com/docs/git-credential-store
- Git credential helpers documentation: https://git-scm.com/doc/credential-helpers
- Git Credential Manager rename documentation: https://github.com/git-ecosystem/git-credential-manager/blob/main/docs/rename.md
- GitHub Docs, managing personal access tokens: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub Docs, using GITHUB_TOKEN in workflows: https://docs.github.com/en/actions/tutorials/authenticate-with-github_token
- GitLab Docs, CI/CD job token: https://docs.gitlab.com/ci/jobs/ci_job_token/
- Ubuntu manpage for secret-tool: https://manpages.ubuntu.com/manpages/focal/man1/secret-tool.1.html

## Issues Found
- Updated Windows Git Credential Manager examples from `manager-core` to `manager`, while noting that older installations may still show `manager-core`. Git Credential Manager Core was renamed, and current guidance recommends the `manager` helper name.
- Corrected a Linux/KDE example that installed `ksshaskpass` but configured `git-credential-libsecret`. `ksshaskpass` is an SSH askpass tool, not the Git libsecret credential helper. The text now explains using libsecret with a Secret Service implementation such as KWallet.
- Fixed the Linux token storage example so the cache helper timeout is quoted as one credential helper value: `git config --global credential.helper 'cache --timeout=43200'`.
- Corrected the multiple-GitHub-accounts example to enable `credential.useHttpPath` before path-specific credential matching, and changed the store helper option to `--file ~/.git-credentials-work` so shell tilde expansion works as Git documents.
- Clarified the CI/CD environment variable example. `GIT_ASKPASS` is a Git-recognized environment variable, but `GIT_USERNAME` and `GIT_PASSWORD` are not used by Git automatically unless an askpass script or shell URL expansion uses them.
- Updated the quick reference and summary to use the current `manager` helper name for Windows.

## Review Notes
The post is technically relevant and mostly aligned with current Git credential documentation. Future improvements could mention GitHub's recommendation to use fine-grained personal access tokens where supported and avoid embedding tokens directly in clone URLs because they can appear in process lists, shell history, and logs.
