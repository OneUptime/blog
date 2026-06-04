# Validation Summary: How to Run Wazuh in Docker for SIEM

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Wazuh
- Docker
- Docker Compose
- Wazuh agent
- Wazuh ruleset XML
- Wazuh Active Response
- Wazuh Docker listener
- OpenSearch / Wazuh Indexer

## Sources Consulted
- Wazuh Docker deployment documentation: https://documentation.wazuh.com/current/deployment-options/docker/wazuh-container.html
- Wazuh Docker utilities documentation: https://documentation.wazuh.com/current/deployment-options/docker/container-usage.html
- Wazuh Linux agent package installation documentation: https://documentation.wazuh.com/current/installation-guide/wazuh-agent/wazuh-agent-package-linux.html
- Wazuh Docker monitoring documentation: https://documentation.wazuh.com/current/user-manual/capabilities/container-security/monitoring-docker.html
- Wazuh Active Response configuration reference: https://documentation.wazuh.com/current/user-manual/reference/ossec-conf/active-response.html
- Wazuh rules syntax documentation: https://documentation.wazuh.com/current/user-manual/ruleset/ruleset-xml-syntax/rules.html
- Wazuh custom rules documentation: https://documentation.wazuh.com/current/user-manual/ruleset/rules/custom.html
- Official Wazuh Docker repository, v4.14.5 single-node compose file: https://github.com/wazuh/wazuh-docker/blob/v4.14.5/single-node/docker-compose.yml
- Official Wazuh Docker repository, v4.14.5 Wazuh agent compose file: https://github.com/wazuh/wazuh-docker/blob/v4.14.5/wazuh-agent/docker-compose.yml
- Official Wazuh ruleset, Docker integration rules in v4.14.5: https://github.com/wazuh/wazuh/blob/v4.14.5/ruleset/rules/0560-docker_integration_rules.xml

## Issues Found
- The post pinned Wazuh Docker `v4.7.0`, which is outdated relative to the current official deployment documentation. Updated repository clone commands and container images to `v4.14.5`.
- The custom Docker Compose example omitted required Wazuh manager, Filebeat, dashboard, and certificate mounts and used service names/certificate paths that do not match the current official single-node deployment. Replaced it with a compose structure aligned with the official `v4.14.5` single-node stack.
- The manager port comments for `1514` and `1515` were reversed. Corrected `1514` to agent communication and `1515` to agent enrollment.
- The Debian/Ubuntu Wazuh agent installation commands used an older simplified GPG key setup and omitted required prerequisite packages. Updated them to the official `gnupg`/`apt-transport-https` and keyring import flow.
- The containerized Wazuh agent example used `WAZUH_MANAGER` and host-monitoring mounts that do not match the official Wazuh agent container deployment. Updated it to use `WAZUH_MANAGER_SERVER` and the documented mounted agent configuration path.
- The custom SSH rule used invalid Wazuh rules syntax, `<same_source_ip />`. Replaced it with the documented `<same_srcip />` option.
- The Docker custom rules used incorrect lowercase field names and attempted to detect privileged containers from a field not present in Wazuh Docker listener events. Updated the rules to match the official Docker listener event fields and built-in parent rule.
- The custom rule copy and restart commands referenced old container names. Updated them to use `docker compose` service names from the current compose file.
- The Active Response example omitted the mandatory `<disabled>` field. Added `<disabled>no</disabled>`.
- The Docker listener section incorrectly said to configure the Wazuh manager to monitor Docker events from the host. Updated it to configure the Wazuh agent on the Docker host, matching official documentation.
- The snapshot repository command lacked the required `path.repo` and snapshot mount context. Added comments stating those prerequisites before registering the repository.

## Review Notes
- The post is now accurate as a Wazuh `4.14.5` Docker deployment guide. Future updates should re-check the pinned Wazuh Docker tag and the official compose file because Wazuh periodically changes image versions, certificate generator settings, and internal certificate paths.
