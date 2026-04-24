# Validation Summary: How to Set Up Stack Auto-Updates from Git in Portainer (Polling)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Compose / Docker stacks
- Git
- GitOps-style polling-based redeployments

## Sources Consulted
- Portainer Documentation: Add a new stack — https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Documentation: Inspect or edit a stack — https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer Documentation: How do automatic updates for stacks/applications work? — https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer Documentation: Why do relative bind mounts appear empty after updating a stack that was deployed from Git? — https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/empty-relative-bind-mounts
- Git documentation: git-ls-remote — https://git-scm.com/docs/git-ls-remote

## Issues Found
1. **Portainer UI labels and flow were outdated/inaccurate.** The post referred to `Repository` as the build method, `Automatic updates` as the toggle, `Polling interval` as the field name, and `Update the stack` as the save action for an existing Git-based stack. Updated these to match current Portainer documentation: `Git Repository`, `GitOps updates`, `Fetch interval`, `Edit Git settings`, `Redeploy`, and `Save settings`.

2. **The repository reference examples used raw ref paths where the current docs present branch/reference selection more generally.** Updated examples from `refs/heads/main` and `refs/heads/develop` to `main` and `develop` to better match the documented UI and reduce ambiguity.

3. **The polling interval section incorrectly claimed Portainer polls the Git provider API and included GitHub REST API rate-limit math.** The official Portainer docs describe Portainer connecting to the remote Git repository and checking the latest commit hash, but do not document GitHub REST API usage for this feature. Replaced that section with a generic operational caution about shorter intervals increasing load.

4. **The `Force re-pull images` explanation overstated what polling alone does.** Official Portainer docs state that Portainer first compares the latest remote commit hash with the stored deployed hash, and if they match no update occurs. Updated the section to use the current option name `Re-pull image` and clarified that it affects updates when a redeploy is triggered; it does not by itself cause redeploys when only a mutable image tag changes and the Git commit is unchanged. Added the required `Force redeployment` caveat.

5. **The mutable-tag recommendation conflicted with Git-triggered polling behavior.** The original text suggested changing `IMAGE_TAG` in Portainer stack environment variables or in the Compose file after recommending Git-based tag updates. Updated this to instruct readers to change the image tag in the Compose file, then commit and push, which aligns with the polling workflow described in the article.

## Review Notes
- Current Portainer documentation confirms polling-based GitOps updates for Git-deployed stacks in current CE/BE releases, but the exact `CE 2.14+` minimum-version claim was not substantiated by the consulted docs, so the prerequisite was generalized.
- Portainer documentation also notes that `Force redeployment` can be useful beyond mutable tags, for example to ensure containers are recreated when relative-path bind mounts need remounting after a Git-based update.
