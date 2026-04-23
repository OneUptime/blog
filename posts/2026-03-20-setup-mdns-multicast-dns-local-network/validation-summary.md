# Validation Summary: How to Set Up mDNS (Multicast DNS) on a Local Network

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Multicast DNS (mDNS)
- DNS-Based Service Discovery (DNS-SD)
- Avahi
- nss-mdns / NSS
- Linux systemd
- Debian/Ubuntu package management
- Fedora/RHEL/CentOS package management
- iptables firewall rules

## Sources Consulted
- RFC 6762: Multicast DNS: https://datatracker.ietf.org/doc/html/rfc6762
- Avahi upstream README: https://github.com/avahi/avahi
- Avahi `avahi-daemon.conf` manual source: https://github.com/avahi/avahi/blob/master/man/avahi-daemon.conf.5.xml.in
- Avahi `avahi-daemon` manual source: https://github.com/avahi/avahi/blob/master/man/avahi-daemon.8.xml.in
- Avahi `avahi-resolve` manual source: https://github.com/avahi/avahi/blob/master/man/avahi-resolve.1.xml.in
- Avahi `avahi-browse` manual source: https://github.com/avahi/avahi/blob/master/man/avahi-browse.1.xml.in
- Avahi static service file manual source: https://github.com/avahi/avahi/blob/master/man/avahi.service.5.xml.in
- nss-mdns upstream README: https://github.com/avahi/nss-mdns
- Debian package metadata for `avahi-daemon`, `avahi-utils`, and `libnss-mdns`: https://packages.debian.org/
- Fedora package metadata for `avahi` and `nss-mdns`: https://packages.fedoraproject.org/

## Issues Found
- The introduction listed only the IPv4 mDNS multicast address. RFC 6762 also specifies the IPv6 multicast address `FF02::FB`, so the introduction now mentions both addresses.
- The Debian/Ubuntu install command did not explicitly install `libnss-mdns`, even though the post later configures `mdns4_minimal` in `/etc/nsswitch.conf`. Added `libnss-mdns` to the install command.
- The RHEL/CentOS/Fedora install command implied `nss-mdns` is always available from the default repositories. Fedora provides it directly, while RHEL-family systems may require EPEL, so the comment now notes that caveat.
- The Avahi publish snippet used `publish-hinfo=yes` under a comment about publishing host name and address records. `publish-hinfo` publishes CPU/OS HINFO data, not address records. Replaced it with `publish-addresses=yes` and corrected the comments.
- The firewall example used IPv4 `iptables` rules while the post now documents IPv6 mDNS as well. Clarified that the shown firewall rules are for IPv4 mDNS traffic.
- The conclusion described mDNS discovery as occurring on the same subnet. RFC 6762 frames mDNS as local-link multicast, so the conclusion now says "same local link."

## Review Notes
- The remaining Avahi commands, service file XML, `avahi-resolve`, `avahi-browse`, and systemd usage match Avahi's documented CLI and service-file formats.
- The `iptables` commands are valid IPv4 examples, but modern Linux distributions often manage firewall policy through nftables, firewalld, or ufw. A future update could add distro-specific firewall examples.
- The `sed` command for `/etc/nsswitch.conf` works for a minimal setup, but administrators may want to preserve existing NSS providers such as `myhostname`, `resolve`, or authselect-managed settings on Fedora/RHEL systems.
