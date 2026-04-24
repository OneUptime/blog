# Validation Summary: How to Deploy Edge Stacks to Multiple Environments in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Stacks
- Portainer Edge Agent
- Docker Compose
- Docker Standalone / Docker Swarm edge environments

## Sources Consulted
- Portainer Documentation: Edge Stacks — https://docs.portainer.io/user/edge/stacks
- Portainer Documentation: Add a new Edge Stack — https://docs.portainer.io/user/edge/stacks/add
- Portainer Documentation: The Portainer Edge Agent — https://docs.portainer.io/advanced/edge-agent
- Portainer Documentation: Install Edge Agent Standard on Docker Standalone — https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Documentation: Edge Configurations — https://docs.portainer.io/user/edge/configurations
- Docker Docs: Compose file reference — https://docs.docker.com/reference/compose-file/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
1. **The Edge Agent communication model was overstated.** The post said agents "poll the server (or receive a push)". Portainer documents Edge Agents as polling for pending work and establishing a tunnel when instructed, not receiving direct pushes. Updated the deployment flow wording accordingly.

2. **The Compose example used the obsolete top-level `version` field.** Current Docker Compose documentation marks `version` as obsolete and only retained for backward compatibility. Removed `version: "3.8"` from the sample Compose file.

3. **The build method list was incomplete.** Current Portainer documentation also includes a **Template** build method for Compose Edge Stacks. Added that option to the list.

4. **The Step 3 code fence was mislabeled as SQL.** The snippet is UI guidance, not executable SQL. Changed the fence to plain text.

5. **The per-environment variable section was technically incorrect.** The post claimed Edge Stack variables can be set at the edge group or endpoint level and showed an incomplete `docker run` example for the Edge Agent with arbitrary environment variables. Portainer documents Edge Stack variables as being defined in the Edge Stack UI or via `.env` upload, while device- or group-specific configuration is handled through Edge Configurations / GitOps Edge configurations. Replaced the incorrect example and corrected the explanation.

6. **The deployment status labels did not match the current Portainer UI.** Portainer documents Edge Stack status indicators such as **Acknowledged**, **Images pre-pulled**, **Deployments received**, and **Failed**. Updated the monitoring step to reflect the documented indicators.

7. **The update snippet described the change as a "rolling update" without corresponding rollout configuration.** Portainer supports staged rollouts through update configuration settings, but simply changing an image tag is just a stack update unless those settings are configured. Revised the wording to avoid implying rolling behavior.

## Review Notes
- Edge Stack environment variables in Portainer are documented as a Business Edition feature and, for Compose Edge Stacks, only available on Docker Standalone and Docker Swarm environments.
- For true per-device or per-group differences within one Edge Stack deployment, Portainer’s documented mechanism is Edge Configurations or GitOps Edge configurations using `PORTAINER_EDGE_ID` and `PORTAINER_EDGE_GROUP`.
