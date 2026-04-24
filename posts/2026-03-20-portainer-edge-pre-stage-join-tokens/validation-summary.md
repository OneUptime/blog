# Validation Summary: How to Pre-Stage Edge Agents with Join Tokens

## Status
validated

## Post Type
Technical guide / deployment tutorial

## Technologies Covered
- Portainer
- Portainer Edge Agent
- Portainer API
- Docker
- systemd
- Bash

## Sources Consulted
- Portainer Edge Agent documentation: https://docs.portainer.io/advanced/edge-agent
- Install Edge Agent Standard on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Auto onboarding: https://docs.portainer.io/admin/environments/aeec
- Waiting Room: https://docs.portainer.io/user/edge/waiting-room
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI schema: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer Agent README (official repo): https://github.com/portainer/agent/blob/master/README.md

## Issues Found
1. **Incorrect distinction between Edge Key and join token.** The post described these as separate concepts, but Portainer uses the `EDGE_KEY` value as the join token for an Edge environment. I rewrote the section to explain that the Edge key / join token is a base64-encoded value containing the Portainer API URL, tunnel address, tunnel fingerprint, and environment identifier.
2. **Invalid Portainer API example for creating an Edge environment.** The draft used a JSON payload with unsupported lowercase fields and `isEdgeDevice`, but Portainer documents `POST /api/endpoints` as `multipart/form-data` with fields such as `Name`, `EndpointCreationType`, `ContainerEngine`, `URL`, and `EdgeTunnelServerAddress`. I replaced the example with the documented request shape and kept the response parsing for `Id` and `EdgeKey`.
3. **Edge Agent deployment command did not match Portainer's documented deployment pattern.** The draft used `portainer/agent:latest`, omitted the `/host` and `/data` mounts used by Portainer's generated commands, and did not account for `EDGE_INSECURE_POLL` when self-signed certificates are in use. I updated the provisioning script and repeated examples to use the documented mount layout, a version-matching image placeholder, and explicit `EDGE_INSECURE_POLL` handling.
4. **Device ID fallback logic was incomplete.** The script captured a hardware serial number but never used it, leaving the device ID dependent on the first detected MAC address only. I changed the script so the serial value is a sanitized fallback when no MAC address is available.
5. **systemd repeat-run guard would fail the service on later boots.** Using `ExecStartPre=/bin/bash -c 'test ! -f /opt/.portainer-provisioned'` causes the oneshot service to enter a failed state after provisioning has already completed. I replaced this with `ConditionPathExists=!/opt/.portainer-provisioned`, which cleanly skips the unit once provisioning is done.
6. **Multi-device onboarding flow was inaccurately described.** The post said to reuse a template environment's key for all devices and tied that directly to the Waiting Room flow. Portainer's official docs describe this as Auto onboarding, with devices connecting using the generated onboarding script/key and then appearing in the Waiting Room for association. I rewrote the section to describe the documented Auto onboarding and Waiting Room workflow, and noted that this flow is for Portainer Business Edition.

## Review Notes
- Portainer's docs recommend matching the Edge Agent image version to the Portainer Server version rather than using `latest`; the revised examples reflect that by using a version placeholder.
- Waiting Room is documented as a Portainer Business Edition feature. Environment-specific pre-staging with a per-environment Edge key remains valid outside that flow.
- Portainer's published OpenAPI schema documents `EdgeTunnelServerAddress` on `POST /api/endpoints`; I kept the corrected API example aligned with that official schema.
