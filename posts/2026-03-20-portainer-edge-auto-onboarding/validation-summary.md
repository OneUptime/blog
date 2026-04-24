# Validation Summary: How to Set Up Automatic Edge Environment Onboarding in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Agent
- Portainer Edge Compute / Waiting Room
- Portainer HTTP API
- Docker
- Bash

## Sources Consulted
- Portainer Edge Compute settings: https://docs.portainer.io/admin/settings/edge
- Portainer Auto onboarding: https://docs.portainer.io/admin/environments/aeec
- Portainer Waiting Room: https://docs.portainer.io/user/edge/waiting-room
- Portainer Edge Agent overview: https://docs.portainer.io/advanced/edge-agent
- Install Edge Agent Standard on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer BE 2.39.1 API spec: https://api-docs.portainer.io/versions/ee/2.39.1.yaml

## Issues Found
- The UI flow was incorrect. The post said automatic onboarding was configured entirely under `Settings → Edge Compute`, but current Portainer separates `Settings → Edge Compute` from `Environment-related → Auto onboarding`. I corrected the navigation and settings names to match current docs.
- The original edge-key API example used an unsupported endpoint and payload (`/api/edge/keys` with `allowAutoOnboarding`). I replaced it with the current BE API endpoint `POST /api/endpoints/edge/generate-key`, which returns a general Edge key for auto-onboarding.
- The deployment script used an incomplete Edge Agent container definition. It was missing the `/host` and `/data` mounts used by Portainer’s generated standalone command, used `latest`, and had a brittle device-ID fallback. I corrected the mounts, restart policy, image guidance, and ID generation logic.
- The waiting room UI path and API examples were incorrect. The post referenced `Environments → Waiting Room` and `/api/edge/waiting-room` style endpoints. I updated this to `Edge Compute → Waiting Room`, `GET /api/endpoints?edgeDeviceUntrusted=true`, and `POST /api/endpoints/edge/trust` with numeric endpoint IDs, which matches the current API spec.
- The “skip waiting room” setting name was incorrect. I changed it to disabling `Enable Edge Environment Waiting Room`, which is how Portainer currently enables trust-on-first-connect behavior.

## Review Notes
- Portainer’s current public docs are on the 2.39 LTS track, and the public BE API spec available on April 24, 2026 is version 2.39.1.
- If the Portainer Server uses a self-signed certificate, `EDGE_INSECURE_POLL` must be set to `1`; the post now calls this out.
- If the Portainer Server was started with a custom `AGENT_SECRET`, the same secret must also be provided to the Edge Agent. This is a conditional requirement and was not necessary to add to the main post text.
