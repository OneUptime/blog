# Validation Summary: How to Set Up Wazuh Security Platform on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu 22.04 LTS and 24.04 LTS
- Wazuh 4.14 security platform
- Wazuh indexer, server, dashboard, and agents
- OpenSearch and OpenSearch Dashboards
- Filebeat
- Wazuh File Integrity Monitoring, Vulnerability Detection, SCA, rules, decoders, and Active Response
- Linux shell commands, XML configuration, YAML configuration, Python, and PowerShell

## Sources Consulted
- Wazuh indexer step-by-step installation: https://documentation.wazuh.com/current/installation-guide/wazuh-indexer/step-by-step.html
- Wazuh server step-by-step installation: https://documentation.wazuh.com/current/installation-guide/wazuh-server/step-by-step.html
- Wazuh dashboard step-by-step installation: https://documentation.wazuh.com/current/installation-guide/wazuh-dashboard/step-by-step.html
- Wazuh architecture and required ports: https://documentation.wazuh.com/current/getting-started/architecture.html
- Wazuh vulnerability-detection ossec.conf reference: https://documentation.wazuh.com/current/user-manual/reference/ossec-conf/vuln-detector.html
- Wazuh vulnerability detection configuration guide: https://documentation.wazuh.com/current/user-manual/capabilities/vulnerability-detection/configuring-scans.html
- Wazuh 4.8.0 release notes for removed/deprecated vulnerability detector API/configuration behavior: https://documentation.wazuh.com/current/release-notes/release-4-8-0.html
- Wazuh rules syntax reference: https://documentation.wazuh.com/current/user-manual/ruleset/ruleset-xml-syntax/rules.html
- Wazuh syscheck/FIM ossec.conf reference: https://documentation.wazuh.com/current/user-manual/reference/ossec-conf/syscheck.html
- Wazuh custom active response scripts: https://documentation.wazuh.com/current/user-manual/capabilities/active-response/custom-active-response-scripts.html
- Wazuh password management: https://documentation.wazuh.com/current/user-manual/user-administration/password-management.html
- Wazuh dashboard settings: https://documentation.wazuh.com/current/user-manual/wazuh-dashboard/settings.html

## Issues Found
- The post used the old `<vulnerability-detector>` configuration and provider feed blocks in a later section. Updated it to the current Wazuh 4.14 `<vulnerability-detection>` block with `<enabled>`, `<index-status>`, and `<feed-update-interval>`.
- The vulnerability data examples queried removed/deprecated Wazuh server API endpoints under `/vulnerability`. Replaced them with Wazuh indexer `_search` examples against `wazuh-states-vulnerabilities-*`.
- Custom rules used deprecated `<same_source_ip />`. Replaced it with the current `<same_srcip />` syntax.
- The GeoIP enrichment rule used invalid `<geoip_src>` syntax. Replaced it with the documented `<srcgeoip negate="yes">US|CA|GB</srcgeoip>` form.
- The custom active response script expected legacy positional arguments. Updated it to read the current Wazuh Active Response JSON message from STDIN and extract `command`, `srcip`, and rule ID with `jq`.
- The post used `jq` in the health check and now in the active response example but did not install it. Added `jq` to the dependency installation command.
- Added a note in the manager configuration example that indexer credentials must be stored in the Wazuh manager keystore for the indexer connector.

## Review Notes
The article is technically relevant and broadly aligned with Wazuh 4.14 after the fixes. Some examples still use default credentials and simplified single-node assumptions; these are acceptable for a tutorial but should be hardened before production use.
