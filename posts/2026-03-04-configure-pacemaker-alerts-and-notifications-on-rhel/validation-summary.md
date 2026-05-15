# Validation Summary: How to Configure Pacemaker Alerts and Notifications on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux High Availability Add-On
- Pacemaker alert agents
- pcs cluster management CLI
- crm_resource
- Bash alert scripts
- SMTP email notifications
- Slack webhooks

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation, "Configuring and managing high availability clusters", Chapter 28: Triggering scripts for cluster events: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/configuring_and_managing_high_availability_clusters/index
- Red Hat Enterprise Linux 8 documentation, "Configuring and managing high availability clusters", Pacemaker alert agents: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/configuring_and_managing_high_availability_clusters/index
- Pacemaker Administration 2.1, "Alert Agents": https://clusterlabs.org/projects/pacemaker/doc/2.1/Pacemaker_Administration/html/alerts.html
- Pacemaker Explained 2.1, "Alerts": https://clusterlabs.org/pacemaker/doc/2.1/Pacemaker_Explained/singlehtml/
- ClusterLabs crm_resource(8) manual page: https://clusterlabs.org/projects/pacemaker/man/crm_resource.8.html

## Issues Found
- The post referred to `/usr/share/pacemaker/alerts/alert_smtp.sh` as a ready-to-use built-in agent. RHEL documents `alert_smtp.sh.sample` as a sample agent that should be installed, commonly under `/var/lib/pacemaker/alert_smtp.sh`, on each cluster node. Updated the commands accordingly.
- The SMTP alert example used `email_recipients=admin@example.com` as an alert option. The documented SMTP sample uses `email_sender` as an instance attribute and recipients are configured with `pcs alert recipient add`. Updated the option to `email_sender=donotreply@example.com`.
- The custom alert script was installed under `/usr/share/pacemaker/alerts/`, which is where Pacemaker ships sample agents. Updated the custom script path to `/var/lib/pacemaker/alert_custom.sh`.
- The custom script wrote to `/var/log/pacemaker-alerts.log` without accounting for Pacemaker alert agents running as the `hacluster` user. Added commands to create the log file with `hacluster:haclient` ownership and restrictive permissions.
- The alert-kind filtering example used `options kind=resource`, but `kind` is not a Pacemaker alert filtering option. Updated the example to pass a custom `required_kind=resource` instance attribute and added a matching check in the custom script.
- The environment variable comments omitted the `attribute` alert kind and described `CRM_alert_status` as generally available. Updated the comments to match Pacemaker's documented alert environment variables.
- The test command used `pcs resource fail my_resource`, which is not a documented `pcs resource` command. Replaced it with `crm_resource --resource my_resource --fail`, which ClusterLabs documents as telling the cluster that the resource has failed.
- The post used `pcs alert show` to display alerts. Red Hat documents `pcs alert` and `pcs alert config`; updated the examples to use `pcs alert config`.

## Review Notes
The post now uses script-level filtering for resource-only notifications. Pacemaker also supports native CIB alert filters such as `select_resources`, but the reviewed Red Hat `pcs alert create` documentation does not show a simple `pcs` command equivalent for that filter.
