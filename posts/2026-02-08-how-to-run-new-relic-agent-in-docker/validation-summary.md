# Validation Summary: How to Run New Relic Agent in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- New Relic Infrastructure agent
- New Relic Node.js APM agent
- New Relic Python APM agent
- Node.js
- Express
- Python
- Flask
- Redis

## Sources Consulted
- New Relic documentation: Install infrastructure agent as a container - https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/linux-installation/infra-agent-as-container/
- New Relic documentation: Infrastructure agent configuration settings - https://docs.newrelic.com/docs/infrastructure/infrastructure-agent/configuration/infrastructure-agent-configuration-settings/
- New Relic documentation: Configure the infrastructure agent - https://docs.newrelic.com/docs/infrastructure/new-relic-infrastructure/configuration/configure-infrastructure-agent/
- New Relic documentation: Forward your logs using the infrastructure agent - https://docs.newrelic.com/docs/logs/forward-logs/forward-your-logs-using-infrastructure-agent/
- New Relic documentation: Node.js agent configuration - https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration/
- New Relic documentation: Install the Node.js agent - https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/install-nodejs-agent/
- New Relic documentation: Node.js agent API - https://docs.newrelic.com/docs/apm/agents/nodejs-agent/api-guides/nodejs-agent-api/
- New Relic documentation: Python agent configuration - https://docs.newrelic.com/docs/apm/agents/python-agent/configuration/python-agent-configuration/
- New Relic documentation: Python agent admin script advanced usage - https://docs.newrelic.com/docs/apm/agents/python-agent/installation/python-agent-admin-script-advanced-usage/
- New Relic documentation: New Relic API keys - https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/
- Docker documentation: Compose file reference, services - https://docs.docker.com/reference/compose-file/services/
- Docker documentation: Compose version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- New Relic pricing page - https://newrelic.com/pricing
- npm package metadata for `newrelic`, `express`, and `redis`
- PyPI package metadata for `newrelic`, `flask`, and `redis`

## Issues Found
- The infrastructure agent Docker command omitted `--cgroupns=host`, which New Relic documents as required on cgroup v2 hosts. Added the flag.
- The Docker Compose example used the obsolete top-level `version` key. Removed it to match the current Compose Specification.
- The Docker Compose example included `NRIA_DOCKER_ENABLED`, which is not a documented infrastructure agent setting. Removed it; Docker monitoring is enabled by mounting the Docker socket with the documented container privileges.
- The Docker Compose example did not set the Compose equivalent of Docker's host cgroup namespace. Added `cgroup: host`.
- The Node.js example used Node 20 and older dependency ranges. Updated the Docker base image and package versions to current compatible releases.
- The Python example pinned older package versions. Updated Flask, New Relic, and Redis package pins to current releases.
- The Python app manually called `newrelic.agent.initialize()` even though the container startup command uses `newrelic-admin run-program`, which automatically initializes the agent. Removed the redundant manual initialization and unused imports.
- The license key navigation text used an older UI path. Updated it to the documented New Relic API keys UI URL.
- The infrastructure agent configuration placed process filtering under an invalid nested `process` section. Changed it to the documented top-level `enable_process_metrics` and `include_matching_metrics` settings.
- The infrastructure agent configuration attempted to configure Docker log file forwarding inside `newrelic-infra.yml`. That mixed agent logging configuration with `logging.d` log source configuration, and New Relic notes the containerized infrastructure agent does not include the log forwarder. Removed the invalid log-forwarding block.
- The infrastructure agent configuration used `license_key: ${NRIA_LICENSE_KEY}` in a mounted YAML file. Replaced it with a comment and rely on the documented `NRIA_LICENSE_KEY` environment variable from the Compose service.

## Review Notes
- Verified the Docker Compose snippet with `docker compose config`.
- Verified the `newrelic-infra.yml` snippet with `newrelic/infrastructure:latest` and `newrelic-infra -validate` using a dummy license key.
- Verified the current infrastructure agent image reports version `1.76.1`.
