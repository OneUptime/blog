# Validation Summary: How to Test Network Bond Failover Before Deploying to Production on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux bonding driver
- NetworkManager and nmcli
- iproute2 ip and tc/netem
- iputils ping
- iperf3

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring a network bond: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking
- Linux kernel documentation: Linux Ethernet Bonding Driver HOWTO: https://docs.kernel.org/networking/bonding.html
- iputils ping help/manpage behavior for `-D`, `-O`, `-i`, and `-c`: local `ping -h` output and https://manpages.debian.org/testing/iputils-ping/ping.8.en.html
- iproute2 `ip link` and `tc qdisc` help output: local command help
- iproute2 tc-netem manual for packet loss emulation: https://manpages.debian.org/bookworm/iproute2/tc-netem.8.en.html
- iptables command help: local `iptables --help` output
- iPerf3 user documentation for server/client, duration, and parallel stream options: https://iperf.fr/iperf-doc.php/iperf-download.php

## Issues Found
- The post said software methods simulate a NIC failure without physically pulling cables. Red Hat documents that software deactivation tools such as `nmcli` do not properly test physical link failure events, so I clarified that these methods exercise failover behavior and that cable pulls or switch-port shutdowns are needed for true link-failure testing.
- The post used `iptables -i eth0` and `iptables -o eth0` to block all slave traffic while the bond stayed up. Because IP filtering usually sees the logical bond interface rather than the physical bond port for routed traffic, I replaced that method with `tc qdisc add dev eth0 root netem loss 100%`, which is the appropriate Linux traffic-control tool for packet-loss simulation on an interface.
- The failover duration measurement counted `icmp_seq` as total pings sent, but standard ping output only includes normal reply lines unless missed-reply reporting is enabled. I added `ping -O` and changed the analysis to count successful replies and `no answer yet` lines.
- The throughput claim said post-failover throughput should not be less than one slave's capacity. I softened this to expected single-NIC throughput with normal protocol and test overhead.
- The acceptance criteria hard-coded `200ms (2x miimon)` without specifying `miimon=100` and said all pings should succeed despite also allowing failover packet loss. I changed the criteria to reference the configured monitoring interval and automatic traffic recovery.
- The report here-doc used a quoted delimiter, preventing `$(date)` from expanding. I changed it to an unquoted delimiter so the generated report contains the actual date.
- The cleanup section flushed all iptables rules, which could remove unrelated firewall rules. After replacing the packet-loss method with `tc`, I changed cleanup to remove only the test qdisc on `eth0`.

## Review Notes
The guide is technically relevant and useful for RHEL bonding validation. The examples still use placeholder interface names and IP addresses, which is appropriate for this type of playbook, but readers must adapt them to their own bond, slave interfaces, peer host, and monitoring settings.
