# Validation Summary: How to Set Up Multipath TCP (MPTCP) on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Multipath TCP (MPTCP)
- Linux iproute2 `ip mptcp`
- NetworkManager and `nmcli`
- `mptcpd` and `mptcpize`
- Linux socket and network monitoring tools: `ss`, `nstat`, `sysctl`

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing networking, Getting started with Multipath TCP: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/index
- Red Hat Enterprise Linux 9 Configuring and managing networking, Managing the mptcpd service: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_managing-the-mptcpd-service_configuring-and-managing-networking
- Linux kernel MPTCP documentation: https://docs.kernel.org/networking/mptcp.html
- ip-mptcp(8) manual page: https://man7.org/linux/man-pages/man8/ip-mptcp.8.html
- NetworkManager `connection.mptcp-flags` reference: https://www.networkmanager.dev/docs/api/latest/settings-connection.html
- Multipath TCP for Linux setup and debugging documentation: https://www.mptcp.dev/setup.html and https://www.mptcp.dev/debugging.html
- mptcpize(8) manual page for EL 9 mptcpd: https://man.docs.euro-linux.com/EL%209/mptcpd/mptcpize.8.en.html

## Issues Found
- The prerequisite listed `RHEL.1 or later`, which is not a valid RHEL version. Changed it to `RHEL 9.0 or later`, matching the RHEL 9 MPTCP documentation.
- The `ip mptcp limits set` examples used `subflow`. Updated them to `subflows`, the form shown by current `ip mptcp help` output and Red Hat examples.
- The NetworkManager examples omitted `also-without-default-route`. Added it because Red Hat documents this flag for MPTCP profiles when interfaces do not have a default gateway, which is common in multi-interface MPTCP setups.
- The post described `ss -M` as real-time subflow monitoring. Updated this to `ss -Mani` for MPTCP sockets and added `ss -tani | grep tcp-ulp-mptcp` for viewing TCP subflows, consistent with MPTCP debugging guidance.
- The path manager section used unsupported `ip mptcp pm nl ...` syntax. Replaced it with current `sysctl net.mptcp.path_manager=kernel`, `ip mptcp endpoint`, and `ip mptcp limits` commands.
- The monitoring section referenced `/proc/net/mptcp_net/snmp`, which is not the documented current interface for MPTCP counters. Replaced it with `nstat -asz | grep MPTcpExt` and timestamped `ip mptcp monitor` usage.

## Review Notes
The examples still use placeholder interface names and documentation IP addresses; readers must replace them with addresses and NetworkManager profile names from their own systems. MPTCP remains opt-in for applications unless the application requests `IPPROTO_MPTCP` or is wrapped with a tool such as `mptcpize`.
