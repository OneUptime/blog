# Validation Summary: How to Create a Stack from a Git Repository in Portainer - From

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker CLI
- Git
- GitHub / GitLab / Bitbucket
- GitOps

## Sources Consulted
- Portainer docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer docs: How do automatic updates for stacks/applications work? - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer docs: Environment Variable Management in Docker: .env vs. stack.env - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env
- Docker docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker docs: Services reference - https://docs.docker.com/reference/compose-file/services/
- GitHub Docs: REST API endpoints for deploy keys - https://docs.github.com/en/rest/deploy-keys/deploy-keys
- Portainer source: Git authentication fieldset - https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/app/react/portainer/gitops/AuthFieldset/AuthFieldset.tsx
- Portainer source: Git form defaults and fields - https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/app/react/portainer/gitops/types.ts
- Portainer source: Repository reference field syntax - https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/app/react/portainer/gitops/RefField/RefField.tsx
- Portainer source: GitOps updates UI labels and options - https://github.com/portainer/portainer/blob/742523de1728af0bda6454362ac4945d014c6f3c/app/react/portainer/gitops/AutoUpdateFieldset/AutoUpdateFieldset.tsx

## Issues Found
- The example Compose file used a top-level `version: "3.8"` key. I removed it because current Docker Compose treats `version` as obsolete and validates against the latest Compose Specification automatically.
- The private-repository section instructed readers to generate an SSH deploy key and paste the private key into Portainer. I replaced that with the current Portainer-supported Git credential flow (`username` + personal access token, or a saved Git credential), because current Portainer stack Git auth is modeled around Git credentials rather than a pasted SSH private key field.
- The repository configuration and authentication instructions implied SSH-key input in the stack creation form. I removed that guidance so the post matches the documented Portainer UI and current implementation.
- The post said a specific 40-character commit SHA could be used as the repository reference. I removed that claim because current Portainer documents repository references as Git refs such as `refs/heads/*` and `refs/tags/*`.
- The `.env` explanation said Portainer environment variables override any `.env` file in the repository. I corrected this to Portainer's documented behavior: repository `.env` values are only used for variables that have not already been defined in Portainer.
- The update section used older UI terminology and option labels. I updated it from `Automatic updates` / `Force re-pull images` to the current `GitOps updates` / `Re-pull image` naming and clarified that polling watches the selected Git reference for commit changes.

## Review Notes
- The post now reads as a Docker Standalone-oriented Portainer stack guide. If a future revision wants to target Docker Swarm as well, the example Compose networking and verification steps should be adjusted to be swarm-specific.
- Portainer also supports webhook-triggered GitOps updates in addition to polling, but the post's focus on polling is technically correct.
- Portainer clones the entire repository for Git-backed stack deployments and does not currently support pulling Git submodules as part of stack deployment. This is relevant background but not required for the current scope of the post.
