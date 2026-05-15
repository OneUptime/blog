# Validation Summary: How to Set Up Cluster Node Authentication with hacluster on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Pacemaker
- pcs
- pcsd
- hacluster account
- firewalld
- TLS certificates

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing high availability clusters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index
- Red Hat Enterprise Linux 9 documentation: Creating a Red Hat High-Availability cluster with Pacemaker: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_creating-high-availability-cluster-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9 documentation: Automating system administration by using RHEL system roles, ha_cluster certificate variables: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automating_system_administration_by_using_rhel_system_roles/index
- pcs manual page reference for `pcs host auth`, `pcs host deauth`, and `pcs pcsd certkey`: https://www.mankier.com/8/pcs

## Issues Found
- The post described `hacluster` as Pacemaker node-to-node authentication. Updated it to describe `hacluster` as the `pcs` administration account used to authenticate `pcs` to pcsd on cluster nodes.
- The post stated that the `pcs` package alone creates the `hacluster` user. Updated the wording to match Red Hat cluster installation guidance that installs pcs and pacemaker packages.
- The post said all nodes must have the same password. Updated this to Red Hat's recommendation and clarified that the same password is required when authenticating multiple nodes in one command.
- The post described token generation and storage too broadly. Updated the wording to clarify root token storage in `/var/lib/pcsd/tokens` and the role of tokens for `pcs` and pcsd communication.
- The post referred to expired tokens. Updated the wording to avoid implying a documented token expiration behavior and instead refer to lost tokens or authentication failures.
- The custom pcsd TLS section used direct file copies into `/var/lib/pcsd`. Replaced this with the documented `pcs pcsd certkey` and `pcs pcsd sync-certificates` commands.
- The firewall port list was incomplete for RHEL 9 and incorrectly listed corosync as UDP 5404-5405. Updated it to the Red Hat documented high-availability port list, including UDP 5404-5412 and conditional ports for Pacemaker Remote, quorum device, DLM, and Booth.

## Review Notes
The remaining commands are technically plausible for RHEL 9. The `systemctl enable --now pcsd` form is equivalent to Red Hat's documented separate start and enable commands. The firewalld example using `--permanent` followed by `--reload` is also valid, although Red Hat's examples sometimes add both permanent and runtime services instead.
