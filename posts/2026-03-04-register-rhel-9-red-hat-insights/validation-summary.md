# Validation Summary: How to Register a RHEL System with Red Hat Insights

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Insights / Red Hat Lightspeed
- insights-client
- subscription-manager
- systemd timers
- Ansible
- YAML redaction configuration

## Sources Consulted
- Red Hat Lightspeed client tools and components: https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html/registering_rhel_systems_and_configuring_client_tools_with_red_hat_lightspeed/client-tools-and-components
- Red Hat Lightspeed connect and register systems: https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html/registering_rhel_systems_and_configuring_client_tools_with_red_hat_lightspeed/connecting-and-registering-systems
- Red Hat Lightspeed unregister systems: https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html/registering_rhel_systems_and_configuring_client_tools_with_red_hat_lightspeed/unregistering-systems-with-clients
- Red Hat Lightspeed insights-client command options: https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html/registering_rhel_systems_and_configuring_client_tools_with_red_hat_lightspeed/client-reference
- Red Hat Lightspeed schedule configuration: https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html/client_configuration_guide_for_red_hat_lightspeed/assembly-client-changing-schedule
- Red Hat Lightspeed data redaction: https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html/client_configuration_guide_for_red_hat_lightspeed/assembly-client-data-redaction

## Issues Found
- Red Hat now documents Red Hat Insights for RHEL as Red Hat Lightspeed. Updated the introduction to mention the current product name while preserving the post's Insights terminology.
- The post stated that Insights collects only system configuration data and not user data. Red Hat documentation is more nuanced because system files and command output can contain sensitive information. Updated the wording to mention obfuscation and redaction controls.
- The post advised editing `/etc/insights-client/insights-client.conf` to change the collection frequency. Current Red Hat documentation says RHEL 7.5 and later with Client 3.x should modify the `insights-client.timer` systemd timer with `systemctl edit insights-client.timer`, then enable the schedule. Updated the section accordingly.
- The post used the older `/etc/insights-client/remove.conf` redaction format. Current Red Hat documentation uses `/etc/insights-client/file-redaction.yaml` for file and command redaction and `/etc/insights-client/file-content-redaction.yaml` for pattern and keyword redaction. Replaced the obsolete example with YAML examples.
- The troubleshooting section used a raw `curl` request to the Insights API endpoint. Current official documentation provides `insights-client --test-connection` for connectivity checks. Updated the command.

## Review Notes
The core registration, status, manual collection, no-upload archive review, systemd timer name, unregister command, and Ansible package installation examples are consistent with the official Red Hat documentation reviewed. Red Hat recommends the `rhc` client for broader RHEL 9 registration and management workflows, but `subscription-manager` plus `insights-client` remains relevant for this post's narrower Insights/Lightspeed registration workflow.
