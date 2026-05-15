# Validation Summary: How to Scan RHEL Systems for Known Vulnerabilities Using Red Hat Insights

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux (RHEL)
- Red Hat Insights / Red Hat Lightspeed
- Vulnerability service
- CVE and CVSS vulnerability data
- insights-client
- subscription-manager
- dnf and rpm
- systemd timers
- Ansible playbooks

## Sources Consulted
- Red Hat Lightspeed documentation: Assessing and monitoring security vulnerabilities on RHEL systems - https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html/assessing_and_monitoring_security_vulnerabilities_on_rhel_systems/
- Red Hat Lightspeed vulnerability service overview - https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html/assessing_and_monitoring_security_vulnerabilities_on_rhel_systems/vuln-overview_vulnerability-assess
- Red Hat Lightspeed vulnerability service filtering, business risk, exclusions, status, and sorting - https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html/assessing_and_monitoring_security_vulnerabilities_on_rhel_systems/vuln-refining-data_vuln-overview
- Red Hat Lightspeed client configuration guide: Changing the insights-client schedule - https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html/client_configuration_guide_for_red_hat_lightspeed/assembly-client-changing-schedule
- Red Hat Lightspeed registration guide: Register legacy RHEL systems using subscription-manager and insights-client - https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html/registering_rhel_systems_and_configuring_client_tools_with_red_hat_lightspeed/connecting-and-registering-systems
- Red Hat Lightspeed remediations guide - https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html-single/red_hat_insights_remediations_guide/

## Issues Found
- The registration example used only `insights-client --register`. Current Red Hat documentation describes `insights-client --register` as the second step after registering the system with Red Hat Subscription Management for legacy client registration. Added a `subscription-manager register --activationkey=<activation_key_name> --org=<organization_ID>` command before the Insights registration command.
- The post said business risk tags systems. Red Hat documentation describes business risk as a value assigned to a CVE, with the same value applying across impacted systems. Updated the wording to say business risk levels are assigned to CVEs.
- The post said users can mark a CVE as "Not affected." Current Red Hat documentation lists CVE status values such as "No action - risk accepted" and "Resolved via mitigation," not "Not affected." Updated the section title and wording to match the supported status options.

## Review Notes
Red Hat has renamed Red Hat Insights to Red Hat Lightspeed in current documentation, while many console URLs and older product references still include Insights. The post remains technically usable, but a future editorial update could align terminology with Red Hat Lightspeed naming.
