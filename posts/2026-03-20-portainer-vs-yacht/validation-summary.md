# Validation Summary: Portainer vs Yacht: Lightweight Docker GUI Comparison

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Yacht
- Docker
- Docker Compose
- Docker Swarm
- Kubernetes

## Sources Consulted
- Portainer documentation: https://docs.portainer.io/
- Portainer CE install on Docker: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer API docs: https://docs.portainer.io/api/docs
- Portainer stacks documentation: https://docs.portainer.io/user/docker/stacks
- Portainer RBAC documentation: https://docs.portainer.io/sts/admin/user/roles
- Portainer Docker roles and permissions: https://docs.portainer.io/sts/advanced-topics/docker-roles-and-permissions
- Yacht documentation home: https://dev.yacht.sh/docs/
- Yacht install docs: https://dev.yacht.sh/docs/Installation/Install/
- Yacht getting started docs: https://dev.yacht.sh/docs/Installation/Getting_Started
- Yacht projects docs: https://dev.yacht.sh/docs/Projects/Projects
- Yacht server settings docs: https://dev.yacht.sh/docs/Pages/Server_Settings/
- Yacht user settings docs: https://dev.yacht.sh/docs/Pages/User_Settings/
- Yacht homepage: https://dev.yacht.sh/
- Yacht GitHub organization: https://github.com/Yacht-sh

## Issues Found
- The Portainer overview claimed Portainer provides a CLI for workload management. I changed this to a web UI and HTTP API, which matches the official Portainer documentation.
- The Yacht overview was too generic to be technically useful. I replaced it with docs-backed details about Yacht's focus on templates, one-click deployments, and Docker Compose project support.
- The feature comparison table used multiple `Varies` placeholders for Yacht where the official docs are clearer. I replaced those with specific, verified capabilities such as Docker-only scope, Compose project support, and limited user management.
- The Portainer strengths section described Docker, Swarm, and Kubernetes as "container runtimes". I corrected this to "environments" because Swarm and Kubernetes are orchestration environments, not runtimes.
- The Yacht strengths and "When to Choose Yacht" sections contained vague claims that were not supported by the official docs. I replaced them with documented strengths around templates, Compose editing, and single-host Docker management.
- The Portainer deployment example did not match the current official install guidance. I added the required volume-creation step, switched to the documented `8000` and `9443` port mapping, used `--restart=always`, and updated the image tag to `portainer/portainer-ce:sts`.
- The Yacht deployment example was invalid because it used a placeholder install URL. I replaced it with the official Docker-based installation commands and mapped Yacht to host port `8001` to avoid conflicting with the Portainer example in the same post.
- The migration section implied Yacht-to-Portainer user migration and Portainer-to-Yacht parity that are not generally accurate. I updated the steps to focus on templates, Compose files, and the fact that Yacht is not a direct replacement for Portainer's Kubernetes or RBAC features.

## Review Notes
- Portainer's current docs use `:sts` on the STS install path; Portainer also publishes LTS tags, which may be preferable for production-focused tutorials.
- Yacht's docs emphasize Docker and Docker Compose workflows. The current public docs do not present Yacht as a Kubernetes or multi-environment management platform.
