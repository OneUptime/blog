# Validation Summary: How to Fix 'Could Not Resolve Host' DNS Resolution Failures on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- DNS resolution
- NetworkManager and nmcli
- /etc/resolv.conf
- /etc/nsswitch.conf
- firewalld
- systemd-resolved and resolvectl
- DNS diagnostic tools: host, dig, nslookup, ping

## Sources Consulted
- Red Hat Enterprise Linux documentation: Configuring and managing networking, DNS and NetworkManager guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Local nmcli help output for `nmcli connection modify`
- firewalld documentation for opening services and ports: https://firewalld.org/documentation/howto/open-a-port-or-service.html
- firewalld `firewall-cmd` manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- systemd `resolvectl` manual: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- RFC 1035, Domain Names - Implementation and Specification: https://www.rfc-editor.org/rfc/rfc1035
- Linux man-pages for resolver and name service switch behavior: https://man7.org/linux/man-pages/man5/resolv.conf.5.html and https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html

## Issues Found
- The NetworkManager commands used `ens192` without explaining that `nmcli connection modify` expects a connection profile ID, name, UUID, or D-Bus path. I added `nmcli connection show`, quoted the profile argument, and added a note to replace `ens192` with the connection profile name.
- The firewall section implied `firewall-cmd --add-service=dns` allows outbound DNS queries. That command opens the DNS service for inbound traffic to a DNS server. I changed the wording so it only recommends `--add-service=dns` when the host is serving DNS, and kept the temporary firewalld stop as a diagnostic for local firewall involvement.
- The systemd-resolved cache command assumed systemd-resolved is always present and running. I changed the wording to say `resolvectl flush-caches` applies if systemd-resolved is installed and running.

## Review Notes
The remaining commands are syntactically valid and appropriate for a RHEL DNS troubleshooting guide. The post intentionally uses public Google DNS servers as examples; production systems may need internal, ISP, or policy-approved resolvers instead.
