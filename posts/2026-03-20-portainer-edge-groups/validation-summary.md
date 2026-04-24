# Validation Summary: How to Create Edge Groups in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Edge Compute
- Portainer Edge Agent
- Portainer Edge Groups
- Portainer Edge Stacks
- Docker
- Docker Compose

## Sources Consulted
- Portainer Edge Groups: https://docs.portainer.io/user/edge/groups
- Portainer Edge Stacks: https://docs.portainer.io/user/edge/stacks
- Portainer Tags: https://docs.portainer.io/admin/environments/tags
- Portainer Edge Compute settings: https://docs.portainer.io/admin/settings/edge
- Portainer Edge Agent overview: https://docs.portainer.io/advanced/edge-agent
- Portainer Edge Agent install on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Edge Agent update instructions: https://docs.portainer.io/start/upgrade/edge
- Portainer agent repository README: https://github.com/portainer/agent
- Docker Compose top-level `version` reference: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post used outdated Portainer terminology (`endpoints`) for Edge Groups. I changed this to `Edge environments` to match current Portainer documentation and UI terminology.
- The post said dynamic groups are driven by `EDGE_TAGS` passed to the Edge Agent. That is incorrect. Dynamic Edge Groups use environment tags assigned in Portainer, so I updated the explanation and added the documented `Partial Match` / `Full Match` behavior.
- The Compose and `docker run` examples for the Edge Agent were incomplete and would not work as written. I replaced them with examples that include the required Edge mode settings (`EDGE=1`, `EDGE_ID`, `EDGE_KEY`) and the documented `/host` and `/data` mounts.
- The examples used `portainer/agent:latest`, which is not what Portainer documents for Edge Agent deployment. I changed the examples to the documented `portainer/agent:lts` tag and noted that the agent tag should match the Portainer Server version.
- The Compose snippet used the top-level `version` field, which Docker now marks as obsolete. I removed it to align the example with the current Compose specification.
- Several UI action labels were off from the current docs (`Add Edge Group`, `Create edge group`, `Add edge stack`). I corrected them to the documented labels (`Add Edge group`, `Add edge group`, `Add stack`).

## Review Notes
- The post is technically relevant and salvageable. After the corrections above, it aligns with the current Portainer 2.39 LTS documentation.
- Portainer Edge Compute features must be enabled before Edge Groups and Edge Stacks are available.
- If a Portainer deployment uses a self-signed certificate, the Edge Agent examples need `EDGE_INSECURE_POLL=1`; this is now called out in the post.
