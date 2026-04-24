# Validation Summary: How to Redeploy a Stack from a Git Repository in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker stacks
- Git
- GitHub webhooks
- GitOps

## Sources Consulted
- Portainer Documentation, "Add a new stack": https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Documentation, "Inspect or edit a stack": https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer Documentation, "How do automatic updates for stacks/applications work?": https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer Release Notes: https://docs.portainer.io/release-notes
- GitHub Docs, "Creating webhooks": https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks
- Docker Docs, "Merge Compose files": https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/

## Issues Found
- The post used outdated Portainer UI terminology such as `Automatic updates` and `Auto update`. I updated this to the current `GitOps updates` terminology used in Portainer's documentation.
- The stack creation step referred to `Repository` as the deployment option. I corrected this to `Git Repository`, which matches the documented Portainer UI.
- The polling section incorrectly described `Force redeployment` as the setting that redeploys when image digests do not change. I corrected this by distinguishing `Re-pull image` from `Force redeployment`, matching Portainer's documented behavior.
- The post said Portainer compares the deployed commit against the repository's `HEAD`. I corrected this to the configured repository reference, which is what Portainer documents for Git-backed stack deployments.
- The webhook section described Portainer's standard stack webhook flow instead of the documented Git-backed stack GitOps webhook flow. I updated the steps to use `Edit Git settings` and the `Webhook` mechanism under `GitOps updates`.
- The `curl` example included an unconditional `--insecure` flag and claimed an expected `200 OK` response. I removed both because they were not required or documented for the GitOps webhook example.
- The manual redeploy steps implied that `Pull and redeploy` is launched directly from the stack page and always pulls updated images. I corrected this to the documented `Edit Git settings` workflow and clarified that fresh image pulls depend on `Re-pull image`.
- The repository reference examples used full `refs/...` values and a commit SHA example that are not documented in current Portainer stack docs. I simplified this to documented branch and tag examples.
- The environment-specific Compose guidance told readers to point `Compose path` directly at an override file. I corrected this to use the base Compose file plus `Additional paths`, which matches Portainer's documented multi-file merge behavior.
- The security section recommended SSH keys for Git repository access, which is not part of Portainer's documented Git-backed stack authentication flow. I replaced this with token-scope and TLS-verification guidance that is documented by Portainer.

## Review Notes
- Recent Portainer documentation uses the term `GitOps updates`; some older 2.x Portainer releases may still show `Automatic updates` in the UI.
- Portainer clones the full Git repository for Git-backed stack deployments and does not currently support Git submodules.
