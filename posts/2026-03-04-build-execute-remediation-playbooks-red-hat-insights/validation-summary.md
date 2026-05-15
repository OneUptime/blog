# Validation Summary: How to Build and Execute Remediation Playbooks with Red Hat Insights

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Insights for RHEL
- Red Hat Insights remediations
- Red Hat Hybrid Cloud Console
- Remote host configuration (`rhc`)
- Ansible playbooks
- Red Hat Enterprise Linux (`dnf`, `insights-client`)
- Red Hat Insights Remediations API

## Sources Consulted
- Red Hat Insights Remediations Guide: Remediations overview: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/red_hat_insights_remediations_guide/remediations-overview_red-hat-insights-remediation-guide
- Red Hat Insights Remediations Guide: Viewing and managing remediation plans: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/red_hat_insights_remediations_guide/viewing-managing-remediation-plans_red-hat-insights-remediation-guide
- Red Hat Insights Remediations Guide: Executing remediation plans: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/red_hat_insights_remediations_guide/executing-remediation-playbooks_red-hat-insights-remediation-guide
- Red Hat Insights Remediations Guide: Enabling host communication with Insights: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/red_hat_insights_remediations_guide/host-communication-with-insights_red-hat-insights-remediation-guide
- Red Hat Ansible Automation Platform 2.5 documentation: Setting up Red Hat Insights for Red Hat Ansible Automation Platform Remediations: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.5/html/using_automation_execution/controller-setting-up-insights
- Subscription Central documentation: Getting Started with RHEL System Registration: https://docs.redhat.com/en/documentation/subscription_central/1-latest/html-single/getting_started_with_rhel_system_registration/getting_started_with_rhel_system_registration

## Issues Found
- The post said each Insights finding includes a remediation definition. Red Hat documents that some issues are manual-only and that remediation plans can only be created when a pre-built playbook exists. Changed "each finding" to "many findings" to avoid overstating support.
- The creation workflow used the older/generic "Remediate" and "Save" labels. Red Hat's current remediations workflow uses "Plan remediation" and final review submission. Updated the steps to "Plan remediation" and "Submit".
- The example generated playbook used `hosts: all`, but Red Hat Ansible Automation Platform documentation notes that Insights-generated playbooks contain a `hosts:` value based on the hostname supplied to Insights. Changed the example to a simplified host-specific example.
- The `rhc connect` example omitted activation key and organization parameters, and the remote execution workflow requires the playbook worker package on directly connected systems. Updated the commands to use `rhc connect --activation-key=<activation_key_name> --organization=<organization_ID>` and install `rhc-worker-playbook`.

## Review Notes
The Remediations API endpoint shown is plausible for Red Hat Hybrid Cloud Console API usage, but the post does not cover authentication token creation. Future improvements could add a short note that service account or OAuth token setup is required before `$TOKEN` can be used.
