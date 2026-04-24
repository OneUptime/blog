# Validation Summary: How to Use Portainer in Energy Sector SCADA Environments

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Docker Swarm
- Docker networking
- InfluxDB OSS 2
- Telegraf
- Grafana
- OPC UA
- NERC CIP

## Sources Consulted
- Portainer Edge Agent docs: https://docs.portainer.io/advanced/edge-agent
- Portainer security and disconnected operation docs: https://docs.portainer.io/start/architecture
- Docker `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Docker image save docs: https://docs.docker.com/reference/cli/docker/image/save/
- Docker image load docs: https://docs.docker.com/reference/cli/docker/image/load/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker network create reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker swarm init reference: https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker service create reference: https://docs.docker.com/reference/cli/docker/service/create/
- Docker Swarm networking docs: https://docs.docker.com/engine/swarm/networking/
- InfluxDB Docker Compose setup docs: https://docs.influxdata.com/influxdb/v2/install/use-docker-compose/
- Telegraf OPC UA input plugin docs: https://docs.influxdata.com/telegraf/v1/input-plugins/opcua/
- Telegraf InfluxDB v2 output plugin docs: https://docs.influxdata.com/telegraf/v1/output-plugins/influxdb_v2/
- Telegraf configuration and environment variable docs: https://docs.influxdata.com/telegraf/v1/configuration/
- InfluxDB OSS onboarding guide: https://get.influxdata.com/rs/972-GDU-533/images/InfluxDB-OSS-Onboarding-Guide.pdf
- Grafana Docker configuration docs: https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/
- Grafana configuration docs: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- NERC reliability standards index: https://nerc.com/pa/Stand/Pages/ReliabilityStandards.aspx

## Issues Found
- The air-gapped preload script said it pulled all required images, but it omitted `telegraf:1.27-alpine`, did not create the `images/` directory, and used unquoted shell expansions. I added `mkdir -p images`, added the Telegraf image, and quoted the image and tarfile variables. This matches Docker’s documented `save` and `load` usage.
- The NERC section overstated what the snippet achieves by calling it “NERC CIP Compliant Configuration.” I changed the wording to “NERC CIP-Aligned Configuration” because the shown Docker settings are hardening measures, not a complete compliance implementation.
- The historian Compose example had an incorrect Grafana Docker secret environment variable. I changed `GF_SECURITY_ADMIN_PASSWORD_FILE` to `GF_SECURITY_ADMIN_PASSWORD__FILE`, which is the syntax Grafana documents for Docker secrets.
- The InfluxDB and Telegraf examples were not internally consistent because Telegraf expected `INFLUX_TOKEN`, but the Compose stack did not initialize or pass one. I wired `INFLUX_TOKEN` through the InfluxDB initialization and the Telegraf service so the example can work as written.
- The Telegraf OPC UA node examples used `tags`, but the supported field for node-level extra tags is `default_tags`. I corrected both node examples to use `default_tags` per the official plugin reference.
- The predictive-maintenance Compose snippet was incomplete as a standalone file because it referenced `ot-network` and `ml-logs` without declaring them. I added the external network and volume declarations.
- Both Compose snippets used a top-level `version: '3.8'`. Current Docker Compose documentation marks the `version` field as obsolete, so I removed it.
- The high-availability section incorrectly suggested that two Swarm replicas of `influxdb:2.7-alpine` would create an HA historian. I replaced that with a stateless replicated service example and added an explicit note that InfluxDB OSS is not made highly available simply by setting `--replicas 2`.
- The Swarm HA example also needed a Swarm-capable network. I changed it to create and use an overlay network instead of attaching a service to the local bridge network created earlier in the post.

## Review Notes
- The pinned image versions in the post are older example versions rather than current release recommendations. They were left pinned, but they should be revisited during future content maintenance against each vendor’s current support window.
- The article discusses Portainer’s role in the workflow, but most of the implementation detail is in Docker/Compose/Swarm examples rather than Portainer-specific deployment steps. This is not incorrect, but it does make the post more Docker-centric than the title suggests.
