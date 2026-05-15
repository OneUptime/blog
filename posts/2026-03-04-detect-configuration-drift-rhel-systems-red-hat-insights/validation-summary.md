# Validation Summary: How to Detect Configuration Drift Across RHEL Systems Using Red Hat Insights

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Insights for RHEL / Red Hat Lightspeed
- Red Hat Insights Drift service
- insights-client
- DNF and RPM package management
- Ansible

## Sources Consulted
- Red Hat Insights for RHEL Release Notes with FedRAMP: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html-single/release_notes_with_fedramp/index
- Red Hat blog, "Introducing Red Hat Insights Drift Capability for Red Hat Enterprise Linux configuration troubleshooting": https://www.redhat.com/en/blog/introducing-red-hat-insights-drift-capability-red-hat-enterprise-linux-configuration-troubleshooting
- Red Hat Insights Client Configuration Guide for Red Hat Insights: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/client_configuration_guide_for_red_hat_insights/assembly-client-configuring-insights-client
- Red Hat Insights client command options documentation: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/client_configuration_guide_for_red_hat_insights_with_fedramp/assembly-insights-cli-options

## Issues Found
- The post is built around the Red Hat Insights Drift service as though it is currently available. Red Hat's official release notes state that the Drift service was removed from Red Hat Insights for RHEL as of September 30, 2024, and that users can no longer access the service from the Hybrid Cloud Console or use the associated API endpoints.
- The Red Hat blog post that introduced Drift now includes a notice that the Drift service is decommissioned and no longer available in Red Hat Insights. Because this blog post is dated March 4, 2026, its central workflow is not usable for its publication date.
- The Drift dashboard URL, baseline creation workflow, comparison workflow, comparison filters, and report export instructions all depend on a removed service. These were not edited in place because the tutorial is completely outdated and would require replacement with a different supported approach rather than a narrow technical correction.

## Review Notes
The `insights-client --register` and `insights-client` commands are valid Red Hat Insights client commands, but they do not make the removed Drift service available. Future replacement content should use currently supported Red Hat Insights/Lightspeed, Inventory, Advisor, Compliance, Policies, Image Builder, Satellite, or Ansible Automation Platform workflows rather than Drift.
