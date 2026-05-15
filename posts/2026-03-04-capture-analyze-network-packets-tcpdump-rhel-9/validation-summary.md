# Validation Summary: How to Capture and Analyze Network Packets with tcpdump on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- tcpdump
- libpcap / pcap filter syntax
- Linux packet capture files
- DNF package installation

## Sources Consulted
- tcpdump local man page, version 4.99.4: `man tcpdump`
- pcap-filter local man page: `man pcap-filter`
- tcpdump command help, version 4.99.4: `tcpdump --help`
- tcpdump manual page on man7.org: https://man7.org/linux/man-pages/man1/tcpdump.1.html
- Red Hat Enterprise Linux 9 DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 packet capture documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/capturing-network-packets_configuring-and-managing-networking

## Issues Found
- The first basic capture example said it captured on the default interface but used `-i ens192`, which captures on a specific interface. Changed the command to `sudo tcpdump`, which lets tcpdump select an interface according to its documented behavior.
- The `-v` example said it showed packet contents. `-v` increases verbosity of parsed packet summaries; packet payload display is handled by flags such as `-A`, `-x`, and `-X`. Updated the comment to describe verbose summaries.
- The time-based rotation example used `-G 3600` with a static `-w /tmp/capture.pcap` filename. tcpdump documents that `-G` should use a `strftime` format in the filename; otherwise rotated files can overwrite previous output. Updated the filename to include a timestamp format.
- The TCP connection example claimed to watch for SYN packets without SYN-ACK but matched any packet with the SYN flag set, including SYN-ACK packets. Updated it to match initial SYN packets without ACK and adjusted the comment to avoid overclaiming that this alone proves connection failure.

## Review Notes
The remaining commands and filters are syntactically valid for tcpdump/libpcap. Some examples are intentionally simplified, such as DNS over UDP only and HTTP request inspection for cleartext HTTP only; those are acceptable for the guide but could be expanded in a future revision.
