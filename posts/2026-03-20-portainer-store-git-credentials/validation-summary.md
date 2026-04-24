# Validation Summary: How to Store Git Credentials in Portainer User Settings

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Git
- GitOps
- GitHub personal access tokens
- GitLab personal access tokens

## Sources Consulted
- Portainer account settings documentation: https://docs.portainer.io/user/account-settings
- Portainer stack deployment from Git documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer stack edit and Git settings documentation: https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer automatic GitOps updates FAQ: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer database encryption documentation: https://docs.portainer.io/advanced/db-encryption
- Portainer backup contents FAQ: https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- GitHub personal access token documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub fine-grained token permissions documentation: https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens
- GitLab personal access token documentation: https://docs.gitlab.com/user/profile/personal_access_tokens/

## Issues Found
- The post implied that user-scoped Git credentials are generally available in Portainer user settings. Updated the introduction to note that this feature is available in Portainer Business Edition, matching Portainer's account settings documentation.
- The saved-credential steps used outdated button labels and omitted the authorization type field. Updated the steps to use the current **Add git credential** and **Save git credential** labels and to mention selecting the authorization type.
- The GitHub token guidance listed `read:repo`, which is not a valid GitHub PAT scope. Replaced it with current GitHub guidance: fine-grained tokens with **Contents: Read-only**, or classic tokens with `repo`.
- The GitLab navigation path to create a PAT was outdated. Updated it to the current **Edit profile → Access → Personal access tokens** path from GitLab's official documentation.
- The deployment steps used outdated Portainer UI wording. Updated them to the current **Git repository** deployment method, **Authentication** toggle, and **Git Credentials** selector.
- The SSH section was technically incorrect. Portainer documents user-saved Git credentials for HTTPS authentication, while Portainer's SSH credential type is for Kubernetes provisioning rather than Git repository authentication for stack deployments. Replaced the incorrect instructions with an accurate clarification.
- The credential security section incorrectly claimed Git credentials were encrypted using an installation-specific `SECRET_KEY`. Updated this to match Portainer's current documentation: configuration is stored in the BoltDB-backed `portainer_data` volume, and encryption at rest requires enabling Portainer database encryption with a mounted secret.
- The auto-update section described the feature too loosely and used outdated UI terminology. Updated it to Portainer's current **GitOps updates** wording and clarified that Portainer compares the latest commit hash, then pulls and redeploys when that hash changes.

## Review Notes
- Portainer's current documentation for user-level Git credentials and GitOps stack updates was reviewed against the live docs in April 2026.
- The post remains technically relevant after the corrections and does not require broader restructuring.
