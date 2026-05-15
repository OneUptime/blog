# Validation Summary: How to Configure Pacemaker Alerts and Notifications on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Pacemaker alerts
- pcs CLI
- Pacemaker alert agents
- Postfix
- Bash
- Webhook notifications

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Triggering scripts for cluster events": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_configuring-pacemaker-alert-agents_configuring-and-managing-high-availability-clusters
- Pacemaker Explained 3.0, "Alerts": https://clusterlabs.org/projects/pacemaker/doc/3.0/Pacemaker_Explained/html/alerts.html
- Pacemaker upstream sample alert agents, `alert_smtp.sh.sample` and `alert_file.sh.sample`: https://github.com/ClusterLabs/pacemaker/tree/main/agents/alerts
- pcs upstream command usage for alert commands: https://github.com/ClusterLabs/pcs

## Issues Found
- The post referred to sample alert agents as directly usable `alert_smtp.sh`, `alert_snmp.sh`, and `alert_file.sh` files under `/usr/share/pacemaker/alerts/`. RHEL documents them as sample scripts, commonly installed from `.sample` files to a usable path such as `/var/lib/pacemaker/`. Updated the agent names and added install commands for the SMTP and file agents.
- The email alert path used `/usr/share/pacemaker/alerts/alert_smtp.sh`, but the documented RHEL example installs the sample as `/var/lib/pacemaker/alert_smtp.sh`. Updated the `pcs alert create` command.
- The post configured `email_host=smtp.example.com` as a Pacemaker alert option. The upstream `alert_smtp.sh.sample` supports `email_client`, `email_sender`, and related sendmail behavior, not `email_host`. Replaced this with Postfix relay configuration.
- File alert setup touched `/var/log/cluster/alerts.log` before ensuring the directory existed, and did not set file permissions. Reordered the commands and added ownership and mode settings consistent with RHEL guidance that alert agents run as `hacluster`.
- The custom webhook example wrote the script into `/usr/share/pacemaker/alerts/`. Updated it to `/var/lib/pacemaker/alert_webhook.sh`, matching the installed-agent convention used in the RHEL examples.
- The custom resource alert used `CRM_alert_status` as the displayed return code. RHEL documents `CRM_alert_rc` as the numerical return code for fencing and resource operations, while `CRM_alert_status` is a Pacemaker operation result code for resource alerts. Updated the script to use `CRM_alert_rc`.
- The webhook JSON payload could break if the generated message contained quotes or backslashes. Added simple escaping before building the JSON payload.
- Recipient removal used `pcs alert recipient remove email-alert admin@example.com`, but `pcs` removes alert recipients by recipient ID. Added explicit recipient IDs when creating recipients and updated the removal example to `pcs alert recipient remove admin-email`.
- The filtering section used unsupported `CRM_alert_select_kind` alert options. Pacemaker documents alert filtering with a CIB `<select>` element containing `select_nodes`, `select_fencing`, or `select_resources`. Replaced the incorrect commands with XML snippets showing the documented filter elements.

## Review Notes
The sample alert agents are starting points; Red Hat supports the Pacemaker alert-agent interface but not arbitrary custom alert-agent logic. The post now reflects that sample agents should be installed on each node, while the `pcs` configuration commands only need to be run once.
