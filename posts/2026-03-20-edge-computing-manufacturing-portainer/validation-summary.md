# Validation Summary: How to Set Up Edge Computing for Manufacturing with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Edge Agent
- Portainer Edge Groups
- Portainer Edge Stacks
- Docker Compose
- InfluxDB OSS 2.7
- Eclipse Mosquitto
- OPC UA
- Modbus

## Sources Consulted
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Edge Agent installation for Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Edge Agent architecture: https://docs.portainer.io/2.27/advanced/edge-agent
- Portainer Edge Stacks: https://docs.portainer.io/user/edge/stacks
- Portainer Edge Groups: https://docs.portainer.io/2.27/user/edge/groups
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- InfluxDB OSS v2 Docker Compose setup: https://docs.influxdata.com/influxdb/v2/install/use-docker-compose/
- InfluxDB Docker Official Image: https://hub.docker.com/_/influxdb
- Eclipse Mosquitto Docker Official Image: https://hub.docker.com/_/eclipse-mosquitto/
- OPC Foundation NodeId reference: https://reference.opcfoundation.org/Core/Part3/v104/docs/8.2

## Issues Found
- The Compose example used the top-level `version: "3.8"` field. Docker now documents the `version` field as obsolete in Compose files, so I removed it.
- The InfluxDB and analytics examples were not internally consistent. The post initialized InfluxDB without defining an initial admin token, but the analytics container expected a token. I added `DOCKER_INFLUXDB_INIT_ADMIN_TOKEN` and aligned the analytics container to use the same token so the example can authenticate as written.
- The collector, analytics, and store-and-forward images were presented as if they were standard public images. I marked them as example custom images/services so the post no longer implies they are official Portainer-provided components.
- The Portainer deployment step referenced a vague IoT device management guide and described updates as if Portainer pushed them directly. I replaced this with the documented Edge Agent plus Edge Stack workflow, noted the Edge Compute/Business Edition requirement, and clarified that updates are applied as Edge Agents check in.
- The OT/IT networking section omitted the required Portainer Server connectivity for Edge Agent deployments. I added the outbound TCP 9443 and TCP 8000 requirement from the Portainer documentation.

## Review Notes
- The `industrial/*` and `myregistry/*` images are still examples. Readers need to replace them with images they build or standardize on in their own environment.
- InfluxDB OSS 2.7 remains documented and available, but InfluxData now documents InfluxDB 3 as the latest stable generation. Pinning to 2.7 is still valid when v2 compatibility is required.
- The Mosquitto example is valid as a local broker container, but persistent MQTT broker state depends on broker configuration as well as the mounted data volume. If persistent broker sessions and retained messages matter, an explicit `mosquitto.conf` should be mounted and configured.
