# Validation Summary: How to Troubleshoot DHCP Lease Assignment Issues on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- ISC DHCP server (`dhcpd`)
- DHCP and DHCP relay behavior
- firewalld
- systemd and journald
- NetworkManager
- tcpdump

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing networking infrastructure services: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/
- Red Hat Enterprise Linux 9.5 Release Notes, deprecated DHCP packages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.5_release_notes/deprecated-functionalities
- ISC DHCP 4.4 `dhcpd.leases` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdleases
- ISC DHCP 4.4 `dhcpd.conf` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- Local `systemctl --help`, `journalctl --help`, `ss --help`, `tcpdump --help`, and `nmcli --help` output for command option validation.

## Issues Found
- The pool exhaustion check counted every `lease` block in `/var/lib/dhcpd/dhcpd.leases`, which can include older records for the same address and therefore does not equal active leases. Changed the command to count the latest `binding state active;` per lease address.
- The abandoned lease explanation said abandoned leases simply take up pool space. Updated it to note that they reduce immediately available addresses, but `dhcpd` can reclaim abandoned addresses after checking that they are no longer in use.
- The corrupt lease database recovery example copied the current lease file aside and restored the backup without preserving metadata. Updated it to rename the corrupt file and use `cp -p` for the `dhcpd.leases~` backup, matching Red Hat's documented recovery flow.
- The empty lease database fallback understated the risk. Updated the note to explain that losing existing allocation records can cause reassignment of addresses still in use and possible IP conflicts.
- The post used RHEL 9 DHCP server and client tools without a deprecation caveat. Added a concise note that ISC DHCP server and client packages are deprecated in RHEL 9 and will not be shipped in a later major RHEL release.
- The client-side `dhclient` step did not mention that `dhclient` is deprecated on RHEL 9. Updated the text to scope it to systems where the deprecated package is installed and in use.

## Review Notes
The remaining commands and explanations are consistent with Red Hat's RHEL 9 DHCP documentation and the ISC DHCP manual pages. For future updates, consider adding Kea-based troubleshooting once the blog targets RHEL releases after RHEL 9.
