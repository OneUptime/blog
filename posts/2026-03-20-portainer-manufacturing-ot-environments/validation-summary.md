# Validation Summary: How to Set Up Portainer for Manufacturing OT Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Edge Agent / Edge Compute
- Portainer Edge Groups
- Portainer Edge Jobs
- Portainer Edge Stacks / stack environment variables
- Docker Compose
- Docker health checks
- OPC-UA and MQTT integration patterns for OT middleware
- IEC 62443-aligned OT network segmentation

## Sources Consulted
- Portainer Edge Groups documentation: https://docs.portainer.io/2.27/user/edge/groups
- Portainer Edge Jobs documentation: https://docs.portainer.io/user/edge/jobs
- Portainer Edge Agent documentation: https://docs.portainer.io/advanced/edge-agent
- Portainer Add a new Edge Stack documentation: https://docs.portainer.io/user/edge/stacks/add
- Portainer Inspect or edit a stack documentation: https://docs.portainer.io/sts/user/docker/stacks/edit
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose `up` reference: https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Compose `pull` reference: https://docs.docker.com/reference/cli/docker/compose/pull/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- CISA Foundations for OT Cybersecurity: Asset Inventory Guidance for Owners and Operators: https://www.cisa.gov/resources-tools/resources/foundations-ot-cybersecurity-asset-inventory-guidance-owners-and-operators

## Issues Found
- The Step 2 stack mixed `ports` with `network_mode: host`. Docker documents that port mappings must not be used with host networking, so I removed the published port and kept the host network configuration.
- The Step 2 example used the obsolete top-level `version` field. I removed it to match current Compose guidance.
- The Step 3 Edge Job pulled image tags that were not referenced by the compose file shown in Step 2, so the redeploy command would not necessarily use the pulled versions. I changed the example to `docker compose ... pull` followed by `docker compose ... up -d --force-recreate --wait` against the same compose file.
- The Step 3 command referenced `/opt/stacks/opcua-gateway/docker-compose.yml`, which did not match the earlier `opcua-gateway-stack.yml` filename. I aligned the file path with the example stack file.
- The Step 3 description omitted Portainer's documented Edge Job constraints and scheduling behavior. I added that Edge Jobs are host-level jobs in Edge Compute, currently limited to Docker Standalone hosts using `/etc/cron.d`, and that schedules use the host's local time.
- The Step 4 environment-variable guidance was too broad. Portainer documents this workflow as a stack-level Environment Variables feature for supported Docker Edge Stack deployments in Business Edition, so I corrected the wording accordingly.
- The Step 5 health check implicitly assumed `nc` exists in the image. I kept the example structure, changed the probe target to `127.0.0.1`, and added the missing caveat about the healthcheck binary.
- The summary overstated IEC 62443 as requiring OT/IT separation and stated the Edge Agent model too broadly. I corrected this to Portainer's documented outbound Edge Agent connectivity model and to IEC 62443-aligned network segmentation wording.

## Review Notes
- The container images, registry names, and OT application examples are illustrative/private examples, so the review could verify Docker and Portainer behavior but not vendor-specific image contents or PLC/MES implementation details.
- `docker` is not installed in this workspace, so I could not run `docker compose config`. I validated the shell snippet with `bash -n` and parsed the YAML snippets locally with Python.
