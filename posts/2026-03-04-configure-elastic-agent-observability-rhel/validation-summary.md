# Validation Summary: How to Configure the Elastic Agent for Observability on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Elastic Agent
- Elastic Fleet
- Elasticsearch
- Kibana
- systemd
- firewalld
- YAML

## Sources Consulted
- Elastic Agent RPM standalone installation documentation: https://www.elastic.co/docs/reference/fleet/install-standalone-elastic-agent
- Elastic Agent standalone input configuration documentation: https://www.elastic.co/docs/reference/fleet/elastic-agent-input-configuration
- Elastic Agent command reference: https://www.elastic.co/docs/reference/fleet/agent-command-reference
- Elastic Agent input type reference: https://www.elastic.co/docs/reference/fleet/elastic-agent-inputs-list
- Elastic Agent installation layout documentation: https://www.elastic.co/docs/reference/fleet/installation-layout
- Elastic Agent artifact URL checked: https://artifacts.elastic.co/downloads/beats/elastic-agent/elastic-agent-9.4.0-x86_64.rpm

## Issues Found
- The installation example used Elastic Agent 8.12.0, while the current official RPM example is 9.4.0. Updated the download and install commands to use `elastic-agent-9.4.0-x86_64.rpm`.
- The standalone metrics configuration used nested `data_stream` fields where Elastic's standalone metrics example uses `data_stream.namespace` and `data_stream.dataset`. Updated the metrics input to match the documented standalone configuration format.
- The log input used `type: logfile`, but Elastic's current standalone log file example uses `type: filestream`. Updated the log input to `filestream` and added a stream ID.
- The standalone RPM section started the agent with `sudo elastic-agent run`. Elastic's RPM installation documentation says the package includes a systemd unit, so the service should be enabled and started with systemd. Updated the command to `sudo systemctl enable --now elastic-agent`.
- The firewall section implied that inbound ports must be opened on the agent host for outbound communication. Clarified that the `firewall-cmd --add-port` commands apply to hosts running Elasticsearch or Fleet Server that need to accept inbound connections.

## Review Notes
The YAML configuration snippet was parsed successfully after the corrections. For production standalone deployments, Elastic recommends generating the standalone policy from Kibana where possible and using API keys or scoped credentials rather than the built-in `elastic` superuser.
