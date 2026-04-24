# Validation Summary: How to Set Up Portainer for Industrial IoT Edge Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Agent
- Docker Engine
- Docker Compose / Compose Specification
- Eclipse Mosquitto
- Microsoft OPC Publisher
- InfluxDB 2
- Grafana
- Linux device access for containers

## Sources Consulted
- Portainer Edge Agent install documentation: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Edge Agent architecture documentation: https://docs.portainer.io/advanced/edge-agent
- Portainer Edge Agent upgrade/version guidance: https://docs.portainer.io/start/upgrade/edge
- Portainer architecture overview: https://docs.portainer.io/start/architecture
- Portainer Agent official repository README: https://github.com/portainer/agent
- Docker Engine install on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- InfluxDB OSS v2 Docker Compose documentation: https://docs.influxdata.com/influxdb/v2/install/use-docker-compose/
- Azure Industrial IoT OPC Publisher command-line documentation: https://github.com/Azure/Industrial-IoT/blob/release/2.9.15/docs/opc-publisher/commandline.md
- Azure Industrial IoT official repository and support policy: https://github.com/Azure/Industrial-IoT/tree/release/2.9.15
- Grafana Docker installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/
- Grafana Docker configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/

## Issues Found
- The Docker installation script used an older APT keyring and repository setup and omitted the current `docker-buildx-plugin` and `docker-compose-plugin` packages. Updated the commands to match Docker’s current Ubuntu installation flow.
- The Portainer section used outdated terminology (`endpoint` instead of `environment`) and the Edge Agent command was not valid as written. The multiline shell command contained inline comments that would break execution, omitted mandatory `EDGE=1` and `EDGE_ID` settings, used unsupported `EDGE_POLL_FREQUENCY` and `EDGE_TAGS` environment variables, and did not persist `/data`. Replaced it with a Portainer-aligned deployment example and added the self-signed certificate note Portainer documents.
- The prerequisites mentioned generic connectivity but not the Portainer ports the Edge Agent requires. Updated the prerequisite to call out `9443` and `8000`.
- The Compose example used the legacy top-level `version` field even though current Docker documentation recommends the Compose Specification. Removed the obsolete `version: "3.8"` line.
- The OPC Publisher service was labeled as an OPC UA server even though the image is Microsoft OPC Publisher, and it mounted `pn.json` without instructing the container to use that file. Renamed the service/comment to reflect what it actually is and added `--pf=/appdata/pn.json`.
- The InfluxDB example persisted only `/var/lib/influxdb2`. Official InfluxDB Compose examples also persist `/etc/influxdb2`, so an `influxdb_config` volume was added for configuration persistence.
- The hardware-access example incorrectly implied extra privilege settings were required for basic device mapping. Removed the unnecessary `privileged: false` and `SYS_RAWIO` lines and kept the valid `devices` and `group_add` example.

## Review Notes
- The post is technically valid after the fixes.
- The OPC Publisher example is Azure-specific because `PCS_IOTHUB_CONNSTRING` sends data to Azure IoT Hub; it should be understood as an Azure integration example, not a generic standalone OPC UA server.
- The `data-collector` healthcheck syntax is valid, but the image must include `curl` or an equivalent probe tool for the example to work unchanged.
- The example still uses floating image tags in a few places (`latest` and `lts`). That is acceptable for a blog tutorial, but exact version pinning is safer for production rollouts.
- The InfluxDB example is written for InfluxDB 2.x initialization variables. InfluxDB 3 uses different setup patterns.
