# Validation Summary: How to Set Up Red Hat Insights for Proactive Performance Monitoring on RHEL 9

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Insights / Red Hat Lightspeed
- `rhc`
- `insights-client`
- Performance Co-Pilot (PCP)
- `sysstat`
- `firewalld`

## Sources Consulted
- Red Hat documentation, "Registering RHEL systems and configuring client tools with Red Hat Lightspeed": https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html/registering_rhel_systems_and_configuring_client_tools_with_red_hat_lightspeed/
- Red Hat documentation, "Client configuration guide for Red Hat Lightspeed": https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html-single/client_configuration_guide_for_red_hat_lightspeed
- Red Hat Enterprise Linux 9 documentation, "Monitoring and managing system status and performance": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/monitoring_and_managing_system_status_and_performance/
- firewalld `firewall-cmd` manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The post was titled as a Red Hat Insights setup guide but did not include the RHEL 9 registration flow for connecting a system to Red Hat services. I added the `rhc connect --activation-key=<activation_key_name> --organization=<organization_ID>` command, the `rhc-worker-playbook` install step from Red Hat's RHEL 9 guidance, and verification with `rhc status`.
- The package installation command installed generic monitoring packages but omitted the Red Hat client tools needed for the article's stated goal. I updated it to include `insights-client` and `rhc`, and removed SNMP packages because the article did not configure or verify SNMP.
- The service enablement step incorrectly implied that `sysstat` must be enabled as a service for the shown `sar -u 1 3` check. I removed that service command because the example uses immediate `sar` sampling rather than historical sysstat collection.
- The configuration and firewall sections referenced Prometheus, Grafana, Node Exporter, and SNMP even though the guide did not install or configure those tools. I narrowed those sections to Insights client and PCP configuration, and changed the firewall example to the PCP `pmcd` port used when remote PCP collectors connect to the host.
- The verification section checked a Prometheus endpoint that the guide never installed or configured. I replaced it with Red Hat client verification and a manual `insights-client` run, while keeping the PCP and `sar` checks.
- The summary overstated Red Hat Insights as direct performance monitoring. I reworded it to distinguish Insights recommendations from local RHEL performance monitoring tools.

## Review Notes
- Red Hat documentation now presents these services under the Red Hat Lightspeed name while older URLs and common usage still refer to Red Hat Insights. The post's title and tags still use Red Hat Insights, but the commands and concepts are aligned with current Red Hat guidance.
- PCP/Grafana, Prometheus, SNMP, and Nagios can all be valid parts of a monitoring stack, but this post does not include enough setup detail for those tools. The revised content keeps those references limited to optional alerting where appropriate.
