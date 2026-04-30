# Validation Summary: How to Manage Industrial HART Device Data with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- HART
- HART-IP
- Portainer
- Docker Compose
- Softing smartLink SW-HT
- Industrial remote I/O

## Sources Consulted
- Softing smartLink SW-HT product page: https://industrial.softing.com/us/products/docker/smartlink-sw-ht.html
- Softing smartLink SW-HT User Guide v1.43: https://industrial.softing.com/uploads/softing_downloads/smartLink_SW-HT_U_V1_43.pdf
- Softing smartLink SW-HT Docker Hub tags: https://hub.docker.com/r/softingindustrial/smartlink-sw-ht/tags
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer container log viewer docs: https://docs.portainer.io/user/docker/containers/logs
- Portainer Edge Stacks docs: https://docs.portainer.io/user/edge/stacks
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- FieldComm Group HART overview: https://www.fieldcommgroup.org/technologies/hart
- Telegraf MQTT consumer docs: https://docs.influxdata.com/telegraf/v1/input-plugins/mqtt_consumer/
- Telegraf InfluxDB v2 output docs: https://docs.influxdata.com/telegraf/v1/output-plugins/influxdb_v2/

## Issues Found
- The original post used a non-existent and undocumented gateway image (`industrial/hart-gateway:2.1.0`) and an undocumented `devices.json` schema. I replaced that material with the documented `softingindustrial/smartlink-sw-ht:1.43.1` deployment and the actual smartLink SW-HT configuration model.
- The original architecture and tags described MQTT and OPC-UA, but the documented container exposes HART devices over HART-IP. I updated the architecture, deployment instructions, client configuration step, description, tags, and summary to match the vendor documentation.
- The original Compose example used the top-level `version: "3.8"` field, which Docker documents as obsolete. I removed it.
- The original Telegraf and InfluxDB section was not part of the documented smartLink SW-HT workflow, and the sample pointed at an undeclared `influxdb` service. I replaced that section with documented HART-IP client connectivity guidance.
- The original resilience section discussed Telegraf buffering, which did not apply after correcting the gateway workflow. I replaced it with restart-policy and persistent-volume guidance that matches the documented Docker deployment pattern.

## Review Notes
- The updated stack reflects Softing's published container image and Docker deployment guidance current on 2026-04-30, including required `SMARTLINK_IP` and `SMARTLINK_HOST` settings and HART-IP on port `5094`.
- smartLink SW-HT licensing is node-locked and tied to the number of HART devices, so production deployments should account for license management if the container host changes.
- I YAML-parsed the updated stack snippets locally, but `docker compose` was not installed in the workspace, so I could not run `docker compose config`.
