# Validation Summary: How to Set Up a Highly Available Virtual IP with Pacemaker on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Pacemaker
- pcs CLI
- OCF `heartbeat:IPaddr2` resource agent
- Virtual IP failover
- IPv4 ARP and IPv6 Neighbor Advertisement

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and managing high availability clusters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_high_availability_clusters/index
- Red Hat Enterprise Linux 9: Resource monitoring operations: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_resource-monitoring-operations-configuring-and-managing-high-availability-clusters
- Red Hat Enterprise Linux 9: Getting started with Pacemaker: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_high_availability_clusters/assembly_getting-started-with-pacemaker-configuring-and-managing-high-availability-clusters
- IPaddr2 resource agent man page: https://dyn.manpages.debian.org/bookworm/resource-agents/ocf_heartbeat_IPaddr2.7.en.html
- Red Hat Customer Portal solution on compressed IPv6 with IPaddr2: https://access.redhat.com/solutions/3551801

## Issues Found
- The post described clients as being "redirected" to the active node. A VIP is not a redirect mechanism; Pacemaker assigns the address to the active node and neighboring systems update their Layer 2 neighbor mappings. Updated the wording to say clients reach the node that currently owns the address.
- The post used ARP-only language for all failover behavior. IPaddr2 sends unsolicited ARP packets for IPv4 and Neighbor Advertisement packets for IPv6, so the explanation was updated to cover both protocols.
- The monitoring section said IPaddr2 monitors by sending ARP/neighbor solicitation packets. The resource agent's monitor operation checks resource status; unsolicited ARP or Neighbor Advertisement packets are sent when the address is brought online, and IPv4 ARP refresh during monitoring requires `arp_count_refresh`. Updated the section accordingly.
- The IPv6 example used compressed IPv6 notation (`fd00::100`). Red Hat documents failures with compressed IPv6 addresses for IPaddr2, so the example was changed to expanded notation (`fd00:0:0:0:0:0:0:100`).
- The conclusion claimed seamless failover for client connections. VIP failover moves the address for new traffic, but existing connections may need to reconnect. Updated the conclusion to avoid overstating connection continuity.
- The multiple VIP section suggested independent VIPs as "load distribution." Independent VIP resources do not by themselves distribute load. Updated the wording to describe separate active/passive services.

## Review Notes
The `pcs resource create`, `pcs resource group add`, `pcs status resources`, `pcs resource update`, `pcs resource meta`, `pcs constraint location`, standby/unstandby, failcount, and cleanup examples are consistent with RHEL 9 documentation. The examples assume a working RHEL high availability cluster with fencing already configured, as stated in the prerequisites.
