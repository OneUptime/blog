# Validation Summary: How to Build STONITH Implementation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- STONITH (Shoot The Other Node In The Head) fencing
- Pacemaker
- Corosync
- pcs (pacemaker/corosync configuration system)
- fence_ipmilan (IPMI/BMC fencing)
- fence_apc (APC PDU fencing)
- fence_aws, fence_azure_arm, fence_gce (cloud fencing agents)
- fence_vmware_soap / fence_vmware_rest (VMware fencing)
- ipmitool
- AWS IAM / Terraform for IAM roles
- Azure service principals
- GCP service accounts
- Prometheus / Grafana (monitoring STONITH metrics)
- Slack / PagerDuty webhooks

## Sources Consulted
- [pcs(8) man page (Debian unstable)](https://manpages.debian.org/unstable/pcs/pcs.8.en.html)
- [pcs(8) man page (Ubuntu jammy)](https://manpages.ubuntu.com/manpages/jammy/man8/pcs.8.html)
- [ClusterLabs pcs source code (alert.py)](https://github.com/ClusterLabs/pcs/blob/main/pcs/alert.py)
- [Pacemaker Explained — Alerts (3.0)](https://clusterlabs.org/projects/pacemaker/doc/3.0/Pacemaker_Explained/html/alerts.html)
- [Pacemaker Explained — Fencing (2.1)](https://clusterlabs.org/pacemaker/doc/2.1/Pacemaker_Explained/html/fencing.html)
- [Red Hat: Configuring fencing in a RHEL 8 HA cluster](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_high_availability_clusters/assembly_configuring-fencing-configuring-and-managing-high-availability-clusters)
- [Red Hat: Pacemaker Cluster Properties](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_high_availability_clusters/assembly_controlling-cluster-behavior-configuring-and-managing-high-availability-clusters)
- [fence_ipmilan(8) man page (Debian)](https://manpages.debian.org/unstable/fence-agents/fence_ipmilan.8.en.html)
- [SUSE SLE HA — Fencing and STONITH](https://documentation.suse.com/sle-ha/15-SP7/html/SLE-HA-all/cha-ha-fencing.html)
- [LINBIT KB — Recommendations for Fencing and STONITH](https://kb.linbit.com/pacemaker-stack/stonith/recommendations-for-fencing-and-stonith-devices-in-pacemaker/)

## Issues Found

1. **`pcs stonith verify --full` is not a valid subcommand.**
   - Changed to `pcs cluster verify --full`, which is the correct way to validate the CIB (including STONITH configuration). The `pcs stonith` subcommand list does not include `verify`.

2. **`pcs stonith fence node2 --on` is not a valid option.**
   - The `pcs stonith fence` command only supports `--off` (in addition to the default reboot behavior). There is no `--on` option to power a node back on through this command.
   - Replaced with calling the fence agent directly: `fence_ipmilan -a 192.168.1.11 -l admin -p password -P -o on`.

3. **`pcs stonith fence node2 --force` is not a valid option.**
   - The pcs `stonith fence` command does not accept `--force`. The closest standard command is `pcs stonith confirm <node> --force`, which manually confirms to the cluster that a node has been powered off when automatic confirmation fails. Replaced accordingly.

4. **`pcs property set debug=true` is not a valid Pacemaker cluster property.**
   - "debug" is not a documented Pacemaker cluster option. Debug logging is enabled by setting `PCMK_debug=yes` in `/etc/sysconfig/pacemaker` and restarting the service. Updated the example to reflect this.

5. **`pcs stonith update fence-node1 debug=/var/log/fence_node1.log` uses the wrong parameter name.**
   - The fence_ipmilan parameter for writing debug output to a file is `debug_file`, not `debug`. Updated to `debug_file=/var/log/fence_node1.log`.

6. **`pcs alert update smtp-alert select fencing` is not valid pcs syntax.**
   - Inspecting the pcs source for `alert_update`, only `description`, `path`, `options`, and `meta` are accepted; there is no `select` keyword in the pcs CLI. Alert event filters (`select_fencing`, `select_nodes`, etc.) live in the CIB XML. Replaced with a `cibadmin` command that injects the `<select_fencing/>` filter into the alert definition.

## Review Notes

- The post's overall structure, conceptual explanations of STONITH, quorum, and fence levels are technically accurate.
- The `fence_aws` resource as shown in the post relies on instance-profile credentials (the Terraform IAM role example). This is intentional and aligns with the "Using Instance Profiles (Recommended)" section.
- `no-quorum-policy=suicide` is still a documented value in current Pacemaker (alongside `ignore`, `freeze`, `stop`, `demote`), so the example was left as-is.
- The custom `stonith-test.sh` script in "Automated STONITH Testing" calls `fence_ipmilan` without a password argument when running status checks. In production, IPMI credentials would need to be passed (or stored via `BMC_PASSWORD` env var); the script is illustrative and was not modified beyond the other fixes.
- The `fence_vmware_soap` agent is technically deprecated in favor of `fence_vmware_rest` for vSphere 7+; the post already mentions both, which is acceptable.
- IPMI passwords are shown in plain text in command-line examples. This is a common documentation pattern but readers should prefer `passwd_script` or environment variable techniques in production. No change made — the post's "Best Practices" section already advises secure credential storage.
