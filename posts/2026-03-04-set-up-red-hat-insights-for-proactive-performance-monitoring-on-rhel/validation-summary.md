# Validation Summary: How to Set Up Red Hat Insights for Proactive Performance Monitoring on RHEL

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Red Hat Enterprise Linux (RHEL)
- Red Hat Insights for RHEL
- insights-client
- Red Hat Subscription Manager
- systemd timers
- SCAP Security Guide and Insights compliance

## Sources Consulted
- Red Hat Insights client configuration guide: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/client_configuration_guide_for_red_hat_insights/
- Red Hat Insights client CLI options: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/client_configuration_guide_for_red_hat_insights/assembly-insights-cli-options
- Red Hat Insights client configuration file options: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/client_configuration_guide_for_red_hat_insights/assembly-insights-client-cg-config-file
- Red Hat Insights compliance guide: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/assessing_and_monitoring_security_policy_compliance_of_rhel_systems/

## Issues Found
- The post said `insights-client --display-name` views the system ID. Red Hat documents this option as setting the host display name, so the incorrect "view system ID" command was removed.
- The display-name example used `--display-name="webserver-prod-01"`. Red Hat examples pass the display name as an argument, so the command was changed to `--display-name "webserver-prod-01"`.
- The obfuscation example used deprecated `obfuscate=True` and `obfuscate_hostname=True` options. Current Red Hat documentation uses `obfuscation_list=hostname`, so the example was updated.
- The post described `insights-client --compliance` as viewing compliance status. Red Hat documents it as running an OpenSCAP scan and uploading the report, so the Advisor CLI section now uses `--compliance-policies` for listing available policies.
- The post used `insights-client --check-results` to check the last uploaded data. That option is not listed in the current Red Hat Insights client options, so it was replaced with documented `--test-connection` and `--diagnosis` examples.
- The compliance setup section implied that installing `scap-security-guide` alone is enough before scanning. Red Hat documents that the supported SCAP Security Guide package should match the RHEL minor version and that systems must be assigned to a compliance policy before running `insights-client --compliance`, so the comments were clarified.
- The install comment said the Insights client is pre-installed on RHEL 8+. Red Hat notes RHEL 8 minimal installations can be an exception, so the comment was clarified.

## Review Notes
The remaining commands and URLs are consistent with Red Hat documentation. Compliance scans are not part of the default Insights schedule; recurring compliance scans require a separate cron or scheduler entry if desired.
