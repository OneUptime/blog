# Validation Summary: How to Set Up Portainer High Availability

## Status
not-technically-relevant

## Post Type
Tutorial / infrastructure guide

## Technologies Covered
- Portainer Business Edition
- Docker Swarm
- Docker secrets
- NFS / shared storage
- AWS EFS
- HAProxy
- Nginx

## Sources Consulted
- Portainer architecture: https://docs.portainer.io/start/architecture
- Install Portainer BE with Docker Swarm on Linux: https://docs.portainer.io/start/install/server/swarm/linux
- Portainer knowledge base, retaining configuration on Swarm: https://portal.portainer.io/knowledge/how-can-i-ensure-portainers-configuration-is-retained
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Official Portainer BE Swarm stack manifest: https://downloads.portainer.io/ee-sts/portainer-agent-stack.yml
- Docker Swarm services and published ports: https://docs.docker.com/engine/swarm/services/
- Docker CLI reference, `docker secret create`: https://docs.docker.com/reference/cli/docker/secret/create/
- HAProxy backend configuration basics: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/backends/
- NGINX WebSocket proxying: https://nginx.org/en/docs/http/websocket.html
- NGINX upstream module (`ip_hash`): https://nginx.org/r/keepalive

## Issues Found
- The post's central claim is unsupported by current Portainer documentation. Portainer's architecture docs explicitly state that running multiple Portainer Server instances to manage the same clusters is not supported. This invalidates the title, introduction, architecture diagram, and the three-replica stack design.
- The official Portainer Business Edition Swarm deployment manifest publishes a single Portainer Server replica, not an HA server cluster. The current official install docs also assume a single manager node for the Portainer Server deployment.
- The shared BoltDB over NFS/EFS design is not a supported active-active HA pattern for Portainer. Portainer's own knowledge base instead warns that on multi-manager Swarm setups you should constrain the single Portainer service to the node holding the persisted data, otherwise updates may move the service and make Portainer appear as a fresh install.
- The HAProxy example is invalid as written. It defines `server portainer1`, `server portainer2`, and `server portainer3` twice in the same backend. HAProxy's documented backend syntax requires each server line to have a unique name within the backend.
- The failover section does not describe a supported Portainer failover model. Scaling an unsupported three-replica Portainer Server service down from 3 to 2 and back up again is not a documented or supported HA validation procedure for Portainer.
- Because the unsupported active-active Portainer Server design is the article's entire premise, the post cannot be salvaged by targeted corrections. It would require a full rewrite around supported Portainer deployment guidance. No edits were made to the README.

## Review Notes
- Some individual fragments are technically plausible in isolation, such as `docker swarm init`, `docker swarm join`, `docker secret create`, and the NGINX WebSocket header forwarding pattern. Those details do not make the article publishable because the overall Portainer HA architecture is unsupported.
- Portainer's classic Agent on Docker Swarm is currently documented as a legacy option, with the Edge Agent recommended for most use cases. That is a secondary issue here, not the main reason for removal.
