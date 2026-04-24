# Validation Summary: How to Configure Async Edge Agent Ping and Snapshot Frequency (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Edge Agent Async mode
- Docker Compose
- Docker CLI

## Sources Consulted
- Portainer docs: Install Edge Agent Async on Docker Standalone: https://docs.portainer.io/sts/admin/environments/add/docker/edge-async
- Portainer docs: Edge Compute settings: https://docs.portainer.io/2.21/admin/settings/edge
- Portainer docs: Snapshot browsing: https://docs.portainer.io/sts/user/home/snapshot
- Portainer agent source: `os/options.go` (official repo, current `develop` branch snapshot): https://github.com/portainer/agent/blob/22039ab08b48f8cf2652c336ffa1da96adc298e2/os/options.go
- Portainer agent source: `edge/poll_async.go`: https://github.com/portainer/agent/blob/22039ab08b48f8cf2652c336ffa1da96adc298e2/edge/poll_async.go
- Portainer server source: async Edge script generation: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/app/react/edge/components/EdgeScriptForm/scripts.ts
- Portainer server source: async interval selector options: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/app/react/edge/components/EdgeAsyncIntervalsForm.tsx
- Portainer server source: async check-in updates `LastCheckInDate`: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/api/http/handler/endpointedge/endpointedge_status_inspect.go
- Portainer server source: async heartbeat/offline calculation: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/api/internal/endpointutils/endpointutils.go
- Docker docs: Compose `version` top-level element is obsolete: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker docs: `docker compose logs`: https://docs.docker.com/reference/cli/docker/compose/logs/

## Issues Found
- The post described `EDGE_PING_INTERVAL`, `EDGE_CMD_INTERVAL`, and `EDGE_SNAPSHOT_INTERVAL` as agent container environment variables. I removed those references because Portainer's official docs and agent/server source show async intervals are configured on the Portainer environment and delivered to the agent by Portainer during polling.
- The section headings named the three intervals after nonexistent env vars. I renamed them to the actual Portainer concepts: ping interval, command interval, and snapshot interval.
- The Compose snippet implied the intervals were set in `compose.yaml` and used the obsolete top-level `version` field. I removed the unsupported interval env vars, kept the required async agent settings, and dropped the obsolete Compose `version` field.
- The log-monitoring example used a container name that did not match the Compose example and implied grep-able ping/snapshot strings by default. I changed it to `docker compose logs -f edge-agent` and clarified that per-poll messages require `LOG_LEVEL=DEBUG`.
- The UI explanation said a "last seen" timestamp followed the ping interval. I corrected this to `Last Check-in`, and noted that Portainer updates it on any async poll, not only heartbeat polls.
- The "1-hour ping interval" impact section was incorrect. I changed it to describe the behavior when all active async intervals are 1 hour, corrected command latency and snapshot staleness, and fixed the offline rule to Portainer's actual logic of roughly `2x` the shortest active interval plus 20 seconds.
- The tuning examples used unsupported/non-documented per-second values for current Portainer UI flows. I replaced them with values that match the current async interval selector presets exposed by Portainer.
- The post did not state that async Edge Agent mode is a Portainer Business Edition feature. I added that clarification in the introduction.

## Review Notes
- The post is technically valid after correction.
- The example still uses `portainer/agent:latest`. That is functional, but pinning a tested agent version would make the article less time-sensitive.
