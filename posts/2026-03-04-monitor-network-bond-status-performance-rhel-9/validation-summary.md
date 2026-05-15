# Validation Summary: How to Monitor Network Bond Status and Performance on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux bonding driver
- NetworkManager and nmcli
- iproute2 interface statistics
- systemd journalctl
- Net-SNMP and IF-MIB
- iperf3
- ethtool
- cron

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring a network bond": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking
- Linux kernel documentation, "Linux Ethernet Bonding Driver HOWTO": https://docs.kernel.org/networking/bonding.html
- iperf3 official documentation, "Invoking iperf3": https://software.es.net/iperf/invoking.html
- Net-SNMP snmpwalk documentation: https://www.net-snmp.org/wiki/index.php/snmpwalk
- RFC 2863, "The Interfaces Group MIB": https://www.rfc-editor.org/rfc/rfc2863
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Local Linux manual pages for crontab(5), ip-link/ip(8), and ethtool(8)

## Issues Found
- The monitoring script comment described link failure counts as "recent" failures. The bonding driver's `Link Failure Count` is a recorded counter in `/proc/net/bonding/<bond>`, not inherently a recent-event counter. Changed the comment to "recorded link failures."
- The utilization guidance implied that any load-balancing mode with one busy slave should lead to reviewing the hash policy. Hash policy is specifically relevant to hash-based modes such as 802.3ad and balance-xor, not balance-rr in the same way. Updated the wording to narrow the recommendation.
- The iperf3 explanation said a single stream typically uses one slave for load-balancing modes in general. Updated it to "hash-based load-balancing modes" and "single TCP stream" to match bonding flow distribution behavior.
- The SNMP example could imply that installing `net-snmp-utils` alone is enough to query `localhost`. Updated the text to state that the example assumes a local SNMP agent is already configured and running.

## Review Notes
The commands and examples are otherwise technically valid for RHEL-style systems using NetworkManager-managed Linux bonding. The cron example uses the correct `/etc/cron.d` system crontab format with a user field. The SNMP command still depends on local community string and MIB-loading configuration, which varies by environment.
