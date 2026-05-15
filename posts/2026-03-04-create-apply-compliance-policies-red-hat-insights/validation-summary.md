# Validation Summary: How to Create and Apply Compliance Policies in Red Hat Insights

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Lightspeed / Red Hat Insights Compliance
- OpenSCAP
- SCAP Security Guide
- insights-client
- Ansible

## Sources Consulted
- Red Hat Lightspeed documentation, "Assessing and monitoring security policy compliance of RHEL systems" - https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html/assessing_and_monitoring_security_policy_compliance_of_rhel_systems/
- Red Hat Lightspeed documentation, "Managing SCAP security policies in the Red Hat Lightspeed compliance service" - https://docs.redhat.com/en/documentation/red_hat_lightspeed/1-latest/html/assessing_and_monitoring_security_policy_compliance_of_rhel_systems/compliance-managing-policies_intro-compliance
- Red Hat Enterprise Linux 9 Security hardening, "Scanning the system for configuration compliance and vulnerabilities" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- Red Hat Insights Client Configuration Guide for Red Hat Insights with FedRAMP, command options for `insights-client` - https://access.redhat.com/documentation/cn/red_hat_insights/1-latest/pdf/client_configuration_guide_for_red_hat_insights_with_fedramp/Red_Hat_Insights-1-latest-Client_Configuration_Guide_for_Red_Hat_Insights_with_FedRAMP-en-US.pdf
- Red Hat Customer Portal, "Red Hat Insights - Compliance FAQ" - https://access.redhat.com/articles/7001161

## Issues Found
- The policy creation steps said to set a scan schedule in the policy wizard. Red Hat documentation states that the Compliance service does not run automatically on a default schedule and that recurring scans should be configured separately, such as with cron. I changed the wizard step to finish creating the policy.
- The upload section implied that `insights-client` automatically uploads compliance scan results when a compliance module is enabled. Red Hat documents `insights-client --compliance` as the action that runs OpenSCAP and uploads the report, and systems must be assigned to a policy first. I clarified this and added the documented `--compliance-policies` and `--compliance-assign <policy_ID>` commands.
- The Ansible remediation generation command used an empty `--result-id ""`, which is not the documented workflow. Red Hat documents finding the result ID with `oscap info` and passing that value to `oscap xccdf generate fix`. I added result ID extraction and used `--output`.
- The Ansible playbook command did not target localhost explicitly and omitted the `ANSIBLE_COLLECTIONS_PATH` environment variable that Red Hat documents for RHEL 9 generated remediation playbooks. I updated the command to use the documented local inventory, local connection, and collections path.

## Review Notes
The OpenSCAP install command, RHEL 9 data stream path, `oscap info`, `oscap xccdf eval`, `--results`, `--report`, and `insights-client --compliance` usage are consistent with the consulted documentation. Profile availability and SCAP Security Guide versions can vary by RHEL minor release, so production users should confirm the installed content with `oscap info` and use the SCAP Security Guide version supported by Red Hat Lightspeed Compliance for their RHEL minor version.
