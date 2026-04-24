# Validation Summary: How to Change the Default Port in Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer Server
- Portainer Edge Agent
- Docker CLI
- Docker Compose
- Docker Swarm
- Kubernetes
- Helm
- Linux firewall tooling (`ufw`, `firewalld`)

## Sources Consulted
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Using your own SSL certificate with Portainer: https://docs.portainer.io/advanced/ssl
- Install Portainer CE with Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Install Portainer CE on your Kubernetes environment: https://docs.portainer.io/sts/start/install-ce/server/kubernetes/baremetal
- Helm chart configuration options: https://docs.portainer.io/sts/advanced/helm-chart-configuration-options
- The Portainer Edge Agent: https://docs.portainer.io/advanced/edge-agent
- How can I move existing Edge Agent deployments to a new Portainer Server instance?: https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management/how-can-i-move-existing-edge-agent-deployments-to-a-new-portainer-server-instance
- Portainer agent README (official repository): https://github.com/portainer/agent
- Docker `docker service update` reference: https://docs.docker.com/reference/cli/docker/service/update/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Docker standalone and Docker Compose examples changed the Edge tunnel port by remapping `8001:8000`, which is not sufficient for Portainer Edge. Portainer's CLI docs require `--tunnel-port 8001` with a matching `8001:8001` port publish. I updated both examples accordingly.
- The custom internal port example used invalid or outdated Portainer flags (`--ssl` and `--bind :7443`). Portainer's current CLI uses `--bind-https :7443` for the HTTPS listener. I replaced the command with the documented flags.
- The Docker Compose snippet used the top-level `version: "3.8"` field. Docker Compose now marks `version` as obsolete. I removed it.
- The Docker Swarm section implied the shown `docker service update` command covered all port changes. I clarified that the sample command changes the published HTTPS port and that changing the Edge tunnel port also requires updating Portainer's `--tunnel-port` setting in the service definition.
- The Helm example used `httpEnabled: false`, which is not a current Portainer chart value. I replaced it with the documented `tls.force: true` setting and kept the example focused on changing the HTTPS service port.
- The firewall section read like a universal rule set. I clarified that the commands are an example for the `443` and `8001` port choices shown earlier in the post.
- The Edge Agent example placed an `-e` flag after the image name and used incorrect tunnel-address handling. Portainer encodes the server and tunnel address inside `EDGE_KEY`, so changing that address requires regenerating the deployment command and redeploying the agent. I rewrote that section to match the documented behavior.

## Review Notes
- The post is technically correct after the edits above.
- Portainer docs generally use version or channel tags such as `:lts`, `:sts`, or explicit versions and recommend matching agent and server versions. The post still uses `:latest`, which is valid but less reproducible than pinning a specific compatible tag.
