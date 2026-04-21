# Validation Summary: How to Run TCP Traceroute with tcptraceroute

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- tcptraceroute
- Linux traceroute
- TCP SYN traceroute
- UDP and ICMP traceroute behavior
- Linux package installation with apt and dnf
- Homebrew package installation
- Firewall and network connectivity diagnostics

## Sources Consulted
- tcptraceroute upstream man page: https://raw.githubusercontent.com/mct/tcptraceroute/master/tcptraceroute.1
- tcptraceroute upstream examples: https://raw.githubusercontent.com/mct/tcptraceroute/master/examples.txt
- Linux traceroute man page: https://linuxman7.org/linux/man-pages/man8/traceroute.8.html
- Debian tcptraceroute package page: https://packages.debian.org/en/stable/net/tcptraceroute
- Fedora traceroute package metadata: https://packages.fedoraproject.org/pkgs/traceroute/traceroute/fedora-rawhide.html
- CentOS Stream traceroute RPM metadata: https://rpmfind.net/linux/RPM/centos-stream/9/baseos/x86_64/traceroute-2.1.0-19.el9.x86_64.html
- Homebrew tcptraceroute formula: https://formulae.brew.sh/formula/tcptraceroute

## Issues Found
- The post overclaimed that TCP traceroute travels the exact same path as application traffic and identifies exactly where connectivity breaks. Updated the wording to say it uses the same destination port and helps identify where connectivity may break, because traceroute visibility still depends on routing, firewall policy, and whether intermediate devices return responses.
- The traditional traceroute section said ICMP mode requires root. Updated this to "may require privileges" because Linux traceroute documents cases where ICMP traceroute can be allowed for unprivileged users.
- The UDP traceroute port description said high ports greater than 33434. Updated this to "starting at 33434" to match the Linux traceroute default behavior.
- The RHEL/CentOS install command used `yum install tcptraceroute`. Updated it to `dnf install traceroute` and noted that the traceroute package provides `tcptraceroute` on current Fedora/RHEL-family packaging.
- The examples used `8.8.8.8` on TCP port 80 as an open destination. Replaced those examples with `1.1.1.1` because local TCP checks showed `8.8.8.8:80` timing out while `1.1.1.1:80` and `1.1.1.1:443` accepted TCP connections.
- The post said `[closed]` on destination port 443 means SSL is not configured. Corrected this to mean the host responded but TCP port 443 is closed or refused; TCP traceroute does not validate TLS configuration.
- The timeout troubleshooting section stated that a hanging web connection means firewall DROP. Updated it to describe filtering or host issues as possibilities, since timeouts can also be caused by routing problems, host failure, or blocked replies.

## Review Notes
`tcptraceroute` and `traceroute` were not installed in the local environment, so command syntax and option behavior were verified against upstream/manual documentation. Public endpoint reachability for example destinations was checked locally with TCP connection attempts. Actual traceroute output varies by source network, routing policy, and firewall behavior.
