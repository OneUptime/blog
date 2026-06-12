# Validation Summary: How to Configure Dev Container Port Forwarding

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Dev Containers
- VS Code Dev Containers and port forwarding
- Docker and Docker Compose networking
- GitHub Codespaces port forwarding
- mkcert local HTTPS certificates
- Node.js HTTP/HTTPS servers
- Linux networking inspection commands

## Sources Consulted
- Dev Container metadata reference: https://containers.dev/implementors/json_reference/
- Dev Container JSON schema: https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json
- VS Code Dev Containers documentation, "Forwarding or publishing a port": https://code.visualstudio.com/docs/devcontainers/containers#_forwarding-or-publishing-a-port
- VS Code Port Forwarding documentation: https://code.visualstudio.com/docs/debugtest/port-forwarding
- GitHub Codespaces port forwarding documentation: https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace
- GitHub Codespaces troubleshooting for `onAutoForward`: https://docs.github.com/en/codespaces/troubleshooting/troubleshooting-github-codespaces-clients
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/
- Docker host network driver documentation: https://docs.docker.com/engine/network/drivers/host/
- Node.js `net.Server.listen()` documentation: https://nodejs.org/api/net.html#serverlistenport-host-backlog-callback
- mkcert project documentation: https://github.com/FiloSottile/mkcert

## Issues Found
- `requireLocalPort` was described as requiring authentication in Codespaces. Changed the comment to reflect the Dev Container schema: it controls whether the forwarded local port must match the container port.
- `visibility` was shown inside `portsAttributes`, but it is not a supported Dev Container port attribute. Removed those examples and replaced Codespaces visibility configuration with the documented `gh codespace ports visibility` command / Ports panel workflow.
- The `forwardPorts` range example used `"8000-8010"`, which is valid for `portsAttributes` keys but not for `forwardPorts`. Changed the example to list the forwarded ports explicitly while keeping the range attribute.
- The post used `forwardPorts` as if `"3001:3000"` mapped a container port to a different local host port. Corrected this to use `appPort` for Docker-published ports, and clarified that `forwardPorts` is for VS Code forwarding.
- The Docker Compose mapping example forwarded already published host ports through `forwardPorts`. Changed it to show that Compose `ports` publishes those ports directly and does not require VS Code forwarding.
- The localhost binding guidance incorrectly said services bound to `127.0.0.1` are not accessible via VS Code port forwarding. Updated the section to distinguish VS Code forwarded ports from Docker-published ports; Docker-published ports require binding to `0.0.0.0`, while forwarded ports can reach localhost-bound services.
- The HTTPS example implied container-generated mkcert trust was enough for the host browser. Added a note that the host must also trust the mkcert root CA to avoid browser warnings.
- The Docker host networking note said Linux only. Updated it to account for current Docker Desktop host networking support in version 4.34 and later when enabled.

## Review Notes
The devcontainer snippets use comments, which is acceptable because `devcontainer.json` supports JSON with comments. The post still intentionally uses simplified examples; real projects should pin image and dependency versions according to their supply-chain requirements.
