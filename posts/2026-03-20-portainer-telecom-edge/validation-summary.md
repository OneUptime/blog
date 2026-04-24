# Validation Summary: How to Set Up Portainer for Telecommunications Edge Infrastructure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Agent
- Portainer Edge Groups
- Portainer Edge Stacks
- Portainer Edge Jobs
- Docker Engine
- Docker Compose
- Prometheus node_exporter
- Redis

## Sources Consulted
- Portainer Docs: Install Edge Agent Standard on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Docs: The Portainer Edge Agent - https://docs.portainer.io/advanced/edge-agent
- Portainer Docs: Updating the Edge Agent - https://docs.portainer.io/start/upgrade/edge
- Portainer Docs: Edge Groups - https://docs.portainer.io/user/edge/groups
- Portainer Docs: Edge Stacks - https://docs.portainer.io/user/edge/stacks
- Portainer Docs: Add a new Edge Stack - https://docs.portainer.io/user/edge/stacks/add
- Portainer Docs: Edge Jobs - https://docs.portainer.io/user/edge/jobs
- Portainer Docs: How does Portainer secure connectivity to and from Agents and Edge Agents? - https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents
- Docker Docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs: OverlayFS storage driver - https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: Variable interpolation in Compose - https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Define and manage volumes in Docker Compose - https://docs.docker.com/reference/compose-file/volumes/
- Prometheus node_exporter README - https://github.com/prometheus/node_exporter/blob/master/README.md

## Issues Found
- The architecture section implied Edge Agent communication used only port 8000. Portainer documents that Edge Agents poll the Portainer API over port 9443 and use port 8000 for the TLS tunnel, so the text and diagram were corrected.
- The Portainer UI flow was outdated. Current docs use **Environments** > **Add Environment** > **Docker Standalone** > **Start Wizard** > **Edge Agent Standard**, so the steps were updated.
- The Edge Agent `docker run` example was incomplete and out of date. It was missing the required `EDGE_ID`, used `portainer/agent:latest` instead of a version that matches the Portainer Server, and omitted the commonly documented `/data` persistence mount and `/host` bind mount. The example was updated accordingly.
- The original command always set `EDGE_INSECURE_POLL=1`. Portainer documents that this is needed only when the Portainer server uses a self-signed certificate, so the post now treats it as conditional instead of default behavior.
- The sample Compose file used `${HOSTNAME}` for `DEVICE_ID`. Docker Compose interpolation resolves variables from the deployment environment, so this is not a reliable per-device identifier in a Portainer Edge Stack. The unsupported interpolation was removed.
- The node_exporter example did not match the current official container guidance. It now uses the documented image location and host networking pattern needed for host monitoring from a container.
- The Compose example declared `version: "3.8"`, which Docker now marks as obsolete in the Compose Specification reference. The obsolete top-level `version` field was removed.
- The offline cache example used `cache-data` without declaring it as a named volume. The top-level volumes list was updated so the later snippet remains valid.
- The monitoring section claimed per-device resource utilization in a way broader than Portainer documents directly. It was narrowed to host details and per-container statistics, which matches the current docs.

## Review Notes
- The post assumes Portainer Business Edition because Edge Compute features such as Edge Groups, Edge Stacks, and advanced rollout controls are BE features in current documentation.
- `storage-driver: "overlay2"` is valid on supported Linux hosts, but it should be confirmed against the backing filesystem and kernel on constrained or non-standard edge hardware.
- Portainer recommends matching the Edge Agent version to the Portainer Server version. The updated example uses a placeholder for that rather than a floating `latest` tag.
