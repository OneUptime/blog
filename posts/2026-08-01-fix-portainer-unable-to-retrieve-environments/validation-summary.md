# Validation Summary: Fixing “Unable to Retrieve Environments” in Portainer

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer Server
- Portainer Agent and Edge Agent
- Docker Engine and the Docker socket
- Docker remote API and TLS
- Docker Swarm services and overlay networks
- Reverse proxies and HTTP API authentication

## Sources Consulted
- Portainer, Add a Docker Standalone environment: https://docs.portainer.io/admin/environments/add/docker
- Portainer, Install Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer, Connect to the Docker API: https://docs.portainer.io/admin/environments/add/docker/api
- Portainer, Connect to the Docker Socket: https://docs.portainer.io/admin/environments/add/docker/socket
- Portainer, Install Portainer Agent on Docker Swarm: https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer, Portainer architecture: https://docs.portainer.io/start/architecture
- Portainer, The Portainer Edge Agent: https://docs.portainer.io/advanced/edge-agent
- Portainer, Agent and Edge Agent connectivity security: https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents
- Portainer, Updating on Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- Portainer, Why have my agents stopped working after upgrading Portainer?: https://docs.portainer.io/faqs/upgrading/why-have-my-agents-stopped-working-after-upgrading-portainer
- Portainer, Change how an environment is connected without losing stacks: https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management/how-do-i-change-the-way-i-connect-to-an-environment-without-losing-my-existing-stacks
- Portainer, Why can't my agents communicate with Portainer on Swarm?: https://docs.portainer.io/faqs/troubleshooting/why-cant-my-agents-communicate-with-portainer-on-swarm
- Portainer, Requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer, General settings and Portainer backups: https://docs.portainer.io/admin/settings/general
- Portainer Server source: https://github.com/portainer/portainer
- Portainer Agent source and technical documentation: https://github.com/portainer/agent
- Docker, Configure remote access for the Docker daemon: https://docs.docker.com/engine/daemon/remote-access/
- Docker, Protect the Docker daemon socket: https://docs.docker.com/engine/security/protect-access/
- Docker, Rootless mode: https://docs.docker.com/engine/security/rootless/
- Docker, Formatting command output: https://docs.docker.com/engine/cli/formatting/
- Docker, `docker service logs`: https://docs.docker.com/reference/cli/docker/service/logs/
- Docker, Deploy a stack to a Swarm: https://docs.docker.com/engine/swarm/stack-deploy/
- Docker, Overlay network driver: https://docs.docker.com/engine/network/drivers/overlay/

## Issues Found
- The Agent security explanation presented the claim/key-signature protocol and `AGENT_SECRET` as alternatives, which could imply that secret mode replaces signed requests. I clarified that Agent requests remain signed, that the default mode claims the Agent for the first Portainer Server that connects, and that secret mode requires the same `AGENT_SECRET` on the Server and Agent.
- The remote Docker API guidance referred generally to a hostname contained in the server certificate. I corrected this to require the DNS name or IP address used by Portainer to appear in the certificate's Subject Alternative Name, matching current TLS certificate validation and Docker's certificate-generation guidance.
- The Swarm diagnostic commands did not say that `docker service` cluster-management commands must be run on a manager node. I added that requirement so readers do not run them on a worker and misinterpret the resulting error.
- The post showed `docker service logs` without its logging-driver limitation. I noted that Docker supports this command only for services using the `json-file` or `journald` driver.
- The post stated broadly that Swarm prefixes service names with a stack name. I scoped this behavior to services created with `docker stack deploy`, which is the operation that applies the stack-name prefix.

## Review Notes
- Portainer 2.39 documentation classifies the Standard Agent, direct Docker API, and direct Docker socket connection methods as legacy options and recommends the Edge Agent for most new deployments. These methods remain supported and are still relevant when troubleshooting existing installations.
- The Docker and Portainer examples assume the conventional container names `portainer` and `portainer_agent`; installations using different names must substitute their actual object names.
