# Validation Summary: How to Use Gremlin for Controlled Chaos

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Gremlin chaos engineering platform
- Gremlin Agent
- Gremlin REST API
- Gremlin CLI
- Gremlin Helm chart
- Kubernetes
- GitHub Actions
- Python
- OneUptime workflow webhooks

## Sources Consulted
- Gremlin Docs: Installing Gremlin on a virtual machine - https://www.gremlin.com/docs/getting-started-install-virtual-machine
- Gremlin Docs: Installing Gremlin on Kubernetes with Helm - https://www.gremlin.com/docs/getting-started-install-kubernetes-helm
- Gremlin Docs: Getting started with the Gremlin API - https://www.gremlin.com/docs/api-reference-api-keys
- Gremlin Docs: API examples - https://www.gremlin.com/docs/api-reference-examples
- Gremlin Docs: Command Line Interface - https://www.gremlin.com/docs/platform-command-line-interface
- Gremlin Docs: CPU Experiment - https://www.gremlin.com/docs/fault-injection-experiments-cpu
- Gremlin Docs: Latency Experiment - https://www.gremlin.com/docs/fault-injection-experiments-latency
- Gremlin Docs: Blackhole Experiment - https://www.gremlin.com/docs/fault-injection-experiments-blackhole
- Gremlin Docs: Scenarios - https://www.gremlin.com/docs/fault-injection-scenarios
- Gremlin Docs: Restricting Testing Times - https://www.gremlin.com/docs/platform-restricted-time-windows
- OneUptime Docs: Workflow Configuration & Safety - https://oneuptime.com/docs/en/workflows/configuration

## Issues Found
- The Linux installation snippet used the deprecated `apt-key adv` flow. Updated it to use Gremlin's current signed keyring repository configuration and the documented `config.yaml` agent configuration flow.
- The Kubernetes Helm installation snippet created a generic secret with environment-variable field names that do not match Gremlin's documented chart values. Replaced it with the documented `gremlin.secret.teamID`, `gremlin.secret.clusterID`, and `gremlin.secret.teamSecret` Helm values.
- The Gremlin API examples omitted the required `teamId` query parameter. Added `?teamId={GREMLIN_TEAM_ID}` to API requests and added `GREMLIN_TEAM_ID` where needed.
- The API targeting examples used unsupported or ambiguous target shapes such as `percent` with `Random` and `Exact` with tags. Updated them to target one randomly selected matching host with `type: "Random"`, `tags`, and `exact: 1`, matching Gremlin API examples.
- The blackhole Python example referenced `requests`, `os`, and Gremlin credentials without importing or defining them. Added the missing imports and environment-variable setup.
- The CI/CD example used local Gremlin CLI commands with remote targeting flags. Gremlin documents CLI attacks as localized to the host, so these would affect the GitHub runner rather than tagged staging hosts. Replaced them with Gremlin REST API calls.
- The safety-control example used `blackout_windows`, while Gremlin's documented feature is Restricted Time Windows. Renamed the key and comment to `restricted_time_windows`.
- The OneUptime event-reporting snippet used an undocumented telemetry events endpoint and was missing `import os`. Updated it to post to a OneUptime workflow webhook URL supplied by environment variable and added the missing import.

## Review Notes
The scenario and safety configuration snippets remain high-level illustrative examples rather than exported Gremlin configuration files. Gremlin's current docs primarily describe creating Scenarios, Health Checks, and Restricted Time Windows through the web app/API workflows rather than applying the exact YAML/Python structures shown in the post.
