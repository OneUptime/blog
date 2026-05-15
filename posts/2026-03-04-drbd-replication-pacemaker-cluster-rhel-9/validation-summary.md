# Validation Summary: How to Configure DRBD-Based Replication in a RHEL Pacemaker Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- DRBD 9
- LINBIT DRBD packages and OCF resource agents
- Pacemaker
- pcs
- firewalld
- XFS

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing high availability clusters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index
- LINBIT DRBD 9 User's Guide: https://linbit.com/drbd-user-guide/drbd-guide-9_0-en/
- LINBIT technical guide, "HA KVM Virtualization using Pacemaker and DRBD on RHEL 9 or AlmaLinux 9": https://linbit.com/tech-guide/ha-kvm-virtualization-using-pacemaker-and-drbd-on-rhel-9-or-almalinux-9/

## Issues Found
- The install command omitted the DRBD Pacemaker integration package. The post later creates an `ocf:linbit:drbd` resource, and LINBIT documents the Pacemaker integration scripts as part of `drbd-pacemaker` on RPM-based distributions. I added `drbd-pacemaker` to the `dnf install` command.
- The prerequisites did not mention that DRBD packages must be enabled from the LINBIT DRBD package source on RHEL. I added a prerequisite for LINBIT DRBD packages on both nodes.
- The role-qualified colocation command used `Promoted` in the positional role field. Red Hat's documented `pcs constraint colocation add` syntax uses the positional role keywords `promoted` and `unpromoted`, so I changed it to `promoted`.

## Review Notes
- The DRBD resource syntax, `protocol C` explanation, `drbdadm create-md`, `drbdadm up`, forced initial primary promotion, XFS creation on `/dev/drbd0`, firewalld port opening, promotable clone options, Filesystem resource, IPaddr2 resource, ordering constraints, and standby/unstandby failover test are consistent with the referenced documentation.
- The article assumes fencing and quorum are already handled by the existing Pacemaker cluster. That is reasonable for a focused DRBD storage tutorial, but production deployments should verify fencing before relying on automated failover.
