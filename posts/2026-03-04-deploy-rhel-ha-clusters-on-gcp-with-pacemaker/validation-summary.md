# Validation Summary: How to Deploy RHEL HA Clusters on GCP with Pacemaker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat High Availability Add-On
- Pacemaker
- pcs
- GCP Compute Engine
- GCP service accounts and IAM roles
- `fence_gce`
- `gcp-vpc-move-vip`
- GCP alias IP ranges

## Sources Consulted
- Red Hat Documentation: Deploying RHEL 9 on Google Cloud, Chapter 4, "Configuring a Red Hat high availability cluster on Google Cloud" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_rhel_9_on_google_cloud/deploying_rhel_9_on_google_cloud
- Google Cloud Documentation: Configure alias IP ranges - https://cloud.google.com/vpc/docs/configure-alias-ip-ranges
- Google Cloud SDK Reference: `gcloud compute instances network-interfaces update` - https://cloud.google.com/sdk/gcloud/reference/compute/instances/network-interfaces/update
- Google Cloud Documentation: Set up a SQL Server cluster on Linux with Always On availability groups and Pacemaker, STONITH fencing section - https://cloud.google.com/compute/docs/tutorials/high-availability-linux-pacemaker
- Google Cloud IAM Documentation: Compute Engine roles and permissions - https://cloud.google.com/iam/docs/roles-permissions/compute

## Issues Found
- The package list used `resource-agents-gcp`, but Red Hat's RHEL 9 on Google Cloud documentation installs `resource-agents-cloud` for the GCP resource agents. Updated the package name.
- The service account guidance only mentioned Compute Instance Admin. Red Hat's Google Cloud HA guidance and the alias IP workflow require broader compute and network permissions. Updated the wording to recommend Compute Admin and Compute Network Admin, or equivalent least-privilege custom permissions.
- The virtual IP example manually assigned an alias IP to `node1` with `gcloud compute instances network-interfaces update`, which does not make the IP Pacemaker-managed for failover. Replaced it with the Red Hat documented `gcp-vpc-move-vip` and `IPaddr2` resources grouped in Pacemaker.
- The failover test suggested stopping Pacemaker and expecting fencing to trigger. A graceful Pacemaker stop can move resources without necessarily testing STONITH. Updated the instruction to test resource movement with `pcs resource move` and test fencing separately with `pcs stonith fence` during a maintenance window.

## Review Notes
- The `pcs host auth`, `pcs cluster setup`, `pcs cluster start --all`, and `pcs cluster enable --all` workflow is appropriate for current RHEL 9 `pcs`.
- The `fence_gce` STONITH example uses supported `project`, `zone`, `pcmk_host_map`, `pcmk_reboot_timeout`, and `pcmk_monitor_retries` parameters. In production, adding explicit monitor/start operation timeouts and `pcmk_delay_max` can improve behavior in multi-node clusters.
