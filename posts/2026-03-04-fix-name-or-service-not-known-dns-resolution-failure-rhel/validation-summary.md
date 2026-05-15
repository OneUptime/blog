# Validation Summary: How to Fix 'Name or Service Not Known' DNS Resolution Failure on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- DNS and name resolution
- NetworkManager and nmcli
- /etc/resolv.conf
- /etc/nsswitch.conf
- systemd-resolved and resolvectl
- nscd
- SSSD
- firewalld
- dig and netcat

## Sources Consulted
- Red Hat Enterprise Linux 9 networking documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- NetworkManager nmcli settings reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- systemd resolvectl manual: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- Linux getaddrinfo(3) manual: https://www.man7.org/linux/man-pages/man3/getaddrinfo.3.html
- Linux getnameinfo(3) manual: https://www.man7.org/linux/man-pages/man3/getnameinfo.3.html
- Red Hat Developer nsswitch.conf overview: https://developers.redhat.com/blog/2018/11/26/etc-nsswitch-conf-non-complexity/
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Local command help for nmcli, resolvectl, dig, and nc.

## Issues Found
- The opening explanation said the error was a DNS resolution failure and "not a network connectivity issue." The error is a broader name/service resolution failure, and DNS can fail because the configured resolver is unreachable. I changed the wording to say it is a name resolution failure and not proof that general connectivity is down.
- The `/etc/resolv.conf` symlink note implied that any symlink is managed by NetworkManager or systemd-resolved. A symlink only shows that the target should be inspected, so I corrected that note.
- The nsswitch check used `grep hosts`, which can match unrelated or commented lines. I changed it to `grep '^hosts:'` so it checks the active hosts database line.
- The systemd-resolved cache flush command used `systemd-resolve --flush-caches`. Current systemd tooling documents `resolvectl flush-caches`, so I updated the command.
- The firewalld check used `firewall-cmd --list-all | grep dns` to verify outbound DNS. `--list-all` lists enabled zone or policy entries, which is primarily an inbound zone configuration view and does not prove outbound DNS is allowed. I replaced it with direct UDP and TCP port 53 connectivity tests using netcat.

## Review Notes
- The `ens192` connection name in the nmcli examples is environment-specific. Readers need to replace it with their actual NetworkManager connection name, but the command form itself is valid.
- Public resolvers such as 8.8.8.8 and 8.8.4.4 are useful for testing, but production systems may need organization-approved DNS resolvers.
