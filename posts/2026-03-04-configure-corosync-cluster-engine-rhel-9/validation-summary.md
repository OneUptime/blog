# Validation Summary: How to Configure the Corosync Cluster Engine on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9 High Availability Add-On
- Corosync
- Pacemaker
- pcs
- Kronosnet (knet)
- firewalld
- systemd journal

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing high availability clusters, pcs command-line interface and Corosync configuration sections: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/
- Red Hat Enterprise Linux 9 documentation: Creating a high availability cluster with multiple links: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_creating-high-availability-cluster-configuring-and-managing-high-availability-clusters
- Corosync `corosync.conf(5)` manual page for transport, crypto, and token settings: https://www.mankier.com/5/corosync.conf
- pcs `pcs(8)` manual page for status and cluster destroy syntax: https://www.mankier.com/8/pcs
- ClusterLabs Pacemaker "Clusters from Scratch" sample Corosync configuration: https://clusterlabs.org/projects/pacemaker/doc/3.0/Clusters_from_Scratch/pdf/Clusters_from_Scratch.pdf

## Issues Found
- The command for changing Corosync encryption settings used `pcs cluster config update totem crypto_cipher=aes256 crypto_hash=sha256`. In RHEL 9 `pcs cluster config update` accepts crypto settings under the `crypto` group using `cipher` and `hash` option names. Changed it to `sudo pcs cluster config update crypto cipher=aes256 hash=sha256`.
- The authentication failure recovery example used `pcs cluster destroy`, which only destroys the cluster configuration on the current node. Changed it to `pcs cluster destroy --all` so the rebuild sequence consistently removes the cluster configuration across configured nodes before running `pcs cluster setup` again.

## Review Notes
- The post is technically relevant and contains commands and configuration examples, so it was reviewed as a code/configuration tutorial.
- The multiple-link `pcs cluster setup` example matches Red Hat's documented syntax. The first `addr=` value maps to link 0 and the second to link 1.
- The Corosync configuration sample is consistent with a typical `pcs`-created two-node cluster using `knet`, `aes256`/`sha256`, `votequorum`, and `two_node: 1`.
- `udpu` is still documented by Corosync as a transport, but it is deprecated; the post correctly labels it as legacy.
- The `/var/log/cluster/corosync.log` command is valid for configurations that enable Corosync file logging as shown in the sample. On systems relying only on journald/syslog, `journalctl -u corosync -f` is the more generally available log view.
