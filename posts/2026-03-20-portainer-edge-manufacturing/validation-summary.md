# Validation Summary: How to Set Up Edge Compute for Manufacturing Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Compute, Edge Agent, Edge Stacks, and Edge Jobs
- Docker Engine and Docker Compose
- InfluxDB OSS v2
- Grafana provisioning
- Eclipse Mosquitto
- Shell scripting
- OPC-UA, Modbus, and MQTT

## Sources Consulted
- Portainer Edge Compute: https://docs.portainer.io/2.21/admin/settings/edge
- Portainer Edge Stacks: https://docs.portainer.io/user/edge/stacks
- Portainer Edge Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Edge Jobs: https://docs.portainer.io/2.33-lts/user/edge/jobs
- Docker daemon configuration: https://docs.docker.com/engine/daemon/
- Docker logging drivers: https://docs.docker.com/engine/logging/configure/
- `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networking: https://docs.docker.com/compose/how-tos/networking/
- InfluxDB write API: https://docs.influxdata.com/influxdb/v2/api/write-data/
- InfluxDB line protocol reference: https://docs.influxdata.com/influxdb/v2/reference/syntax/line-protocol/
- InfluxDB Docker Compose setup: https://docs.influxdata.com/influxdb/v2/install/use-docker-compose/
- Grafana provisioning: https://grafana.com/docs/grafana/latest/administration/provisioning/

## Issues Found
- The prerequisites and architecture sections referred to generic Portainer connectivity, but Edge Stacks and Edge Jobs are Edge Compute features and require Business Edition with Edge Compute enabled plus the Portainer Edge Agent. I updated those references and clarified that the edge device needs outbound reachability to the Portainer server.
- The architecture section said `Portainer agent`; Portainer’s official edge-management terminology is `Portainer Edge Agent`. I corrected the term.
- The Compose example used a top-level `version: "3.8"` field. Docker’s current Compose reference marks the top-level `version` field as obsolete, so I removed it.
- Multiple services used `MQTT_HOST=mqtt`, but the broker service in the stack is named `mosquitto`. Docker Compose service discovery resolves services by service name, so I changed those values to `mosquitto`.
- The InfluxDB setup example initialized a username, password, organization, and bucket, but the later Edge Job expected a reusable token value. I added `DOCKER_INFLUXDB_INIT_ADMIN_TOKEN` so the post’s write example can reference a concrete setup token.
- The Edge Job example was incorrect for Portainer Edge Jobs and InfluxDB v2. Edge Jobs run on the underlying host, not inside the Compose network, so `http://influxdb:8086` would not resolve from the host; I changed it to `http://localhost:8086` to use the published port. I also added the required `org`, `bucket`, and `precision` query parameters, added the `Content-Type` header, and replaced the invalid timestamp string with a Unix timestamp that matches InfluxDB line protocol requirements.
- The Edge Job comments claimed the script would “flush and archive” data, but the code only wrote an event marker. I updated the wording to match the actual behavior.
- The setup script said disabling swap was a Docker recommendation. Docker documents swap controls, but that comment overstated the guidance, so I replaced it with a neutral latency-oriented rationale.
- The setup script could fail on systems where `/etc/docker` does not exist or where `cpufreq` files are absent. I added `mkdir -p /etc/docker` and guarded the CPU governor loop so the shell example is more robust.

## Review Notes
- The custom `myorg/*` images appear to be illustrative placeholders for application-specific workloads, so the review focused on the Portainer, Docker, InfluxDB, and Grafana mechanics around them rather than image availability.
- The Grafana bind mount assumes the mounted directory contains valid dashboard provisioning YAML and any referenced dashboard JSON files, which is consistent with Grafana’s provisioning model.
- The `deploy.resources` block is valid Compose-spec syntax, but the Compose spec treats `deploy` as optional and actual enforcement depends on the target platform’s implementation.
- Portainer’s official Edge Jobs documentation currently describes the feature as beta and limited to Docker Standalone environments that use `/etc/cron.d`.
