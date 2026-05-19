# Validation Summary: How to Fix 'Name or Service Not Known' Errors on Ubuntu

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ubuntu DNS troubleshooting
- systemd-resolved and resolvectl
- /etc/resolv.conf
- /etc/nsswitch.conf and NSS modules
- Netplan YAML configuration
- DNS tools: dig, host, nslookup
- NetworkManager, UFW, iptables, netcat

## Sources Consulted
- Ubuntu manpage for systemd-resolved: https://manpages.ubuntu.com/manpages/noble/man8/systemd-resolved.8.html
- Ubuntu manpage for nss-resolve: https://manpages.ubuntu.com/manpages/focal/man8/nss-resolve.8.html
- Netplan examples documentation: https://netplan.readthedocs.io/en/1.0.1/examples/
- Netplan YAML reference: https://people.ubuntu.com/~slyon/netplan-docs/netplan-yaml/
- Linux Standard Base getaddrinfo error definitions: https://refspecs.linuxfoundation.org/LSB_4.1.0/LSB-Core-generic/LSB-Core-generic.pdf
- Local system man/help output for resolvectl, systemd-resolved.service, nsswitch.conf, netplan, dig, ufw, and nc.

## Issues Found
- The post said "Name or service not known" could correspond to either `EAI_NONAME` or `EAI_AGAIN`. Corrected this to state that `EAI_NONAME` maps to name/service unknown, while `EAI_AGAIN` is a temporary lookup failure.
- The resolution chain was described as only `/etc/hosts` then DNS. Clarified that this is a simple server setup and that Ubuntu systems may also use NSS sources such as `resolve`, `mdns4_minimal`, and `myhostname`.
- The `resolvectl dns enp3s0 ...` example was labeled as setting DNS globally. Corrected it to say it sets DNS for an interface at runtime.
- The `nsswitch.conf` example contained an invalid `mach` source and placed `resolve` after `dns`. Replaced it with a valid Ubuntu/systemd-resolved-style example using `myhostname` and `resolve [!UNAVAIL=return]` before `dns`.
- The mDNS explanation implied `[NOTFOUND=return]` generally prevents DNS from being tried. Narrowed this to the `.local` case, where the behavior is intentional but can break environments that use `.local` as a unicast DNS domain.
- The `dig +dnssec` comment claimed it checks DNSSEC validation. Corrected it to say it requests DNSSEC records.
- The NetworkManager reconnect example used `nmcli connection down/up enp3s0`, which only works if the connection profile is named `enp3s0`. Changed it to `nmcli device disconnect/connect enp3s0` for an interface-oriented example.

## Review Notes
The remaining commands and snippets are generally correct for Ubuntu systems using systemd-resolved and Netplan, though interface names such as `enp3s0` and package availability for tools like `dig`, `host`, `nslookup`, `dhclient`, and `nc` can vary by installation.
