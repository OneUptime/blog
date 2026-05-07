# Validation Summary: How to Add a Podman Environment to Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Podman
- Portainer HTTP API
- Linux systemd
- `curl`
- Python 3

## Sources Consulted
- Portainer documentation, "Add a Podman environment": https://docs.portainer.io/admin/environments/add/podman
- Portainer documentation, "Connect to the Podman Socket": https://docs.portainer.io/admin/environments/add/podman/socket
- Portainer documentation, "Does Portainer support Podman?": https://docs.portainer.io/faqs/installing/does-portainer-support-podman
- Portainer documentation, "Add an environment via the Portainer API": https://docs.portainer.io/admin/environments/add/api
- Portainer documentation, "Install Portainer CE with Podman on Linux": https://docs.portainer.io/start/install-ce/server/podman/linux
- Podman documentation, `podman-system-service(1)`: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Portainer source, endpoint creation handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer source, Podman socket wizard UI: https://github.com/portainer/portainer/blob/develop/app/react/portainer/environments/wizard/EnvironmentsCreationView/WizardPodman/SocketTab/DeploymentScripts.tsx

## Issues Found
- The post description said the workflow was for managing rootless Podman containers. I changed this because current Portainer documentation says rootless Podman may work but is not officially supported; official support is rootful Podman 5 on CentOS Stream 9.
- The prerequisites were too generic for Podman. I updated them to reflect the documented support limits and the socket bind-mount requirement for Portainer running on Podman.
- The UI steps were technically incomplete for Podman. I changed them to select the Podman environment type explicitly, note that Edge Agent is the recommended option, and include the documented `systemctl enable --now podman.socket` step for socket-based access.
- The API example was incorrect. It posted JSON to `/api/endpoints`, omitted the required `ContainerEngine=podman` value, and described a generic Docker environment instead of a Podman one. I changed it to the current multipart form that Portainer uses for environment creation and made the Podman socket requirement explicit.
- The environment listing example printed only the numeric `Type`, which does not uniquely identify Podman. I changed it to print `ContainerEngine` and `URL`, which are the fields that distinguish the Podman environment in the API response.
- The environment types reference table was wrong. It listed an incorrect value for remote Docker/TCP and omitted the current Edge Agent and Kubernetes local creation-type values. I replaced it with the current `EndpointCreationType` values from Portainer and clarified that Podman is selected through `ContainerEngine=podman` rather than a separate numeric type.
- The verification section described the environment as "healthy". I changed that to "online" to match Portainer's endpoint status field, which is represented as up/down in the API.

## Review Notes
- Portainer currently documents socket and Agent connections for Podman as legacy options and recommends the Edge Agent for most use cases.
- Portainer's public API documentation shows Docker-focused examples for environment creation. The Podman-specific API details used in the fix were verified against Portainer's current official source code.
