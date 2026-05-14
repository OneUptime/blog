# Validation Summary: How to Trace Network Routes with traceroute and tracepath on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- traceroute
- tracepath
- iproute2 `ip route get`
- iputils `ping`
- IPv4 and IPv6 network diagnostics
- Path MTU Discovery

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring policy-based routing to define alternative routes": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-policy-based-routing-to-define-alternative-routes_configuring-and-managing-networking
- Linux traceroute(8) manual page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- Linux tracepath(8) manual page: https://man7.org/linux/man-pages/man8/tracepath.8.html
- Local iputils tracepath(8) manual page, iputils 20240117
- Local iputils ping(8) manual page, iputils 20240117
- Local iproute2 ip-route(8) manual page, iproute2 6.1.0

## Issues Found
- The comparison table said traceroute has no MTU discovery. traceroute supports `--mtu`, so the table now lists MTU discovery as supported by traceroute and tracepath.
- The comparison table implied traceroute generally requires root for ICMP. Modern Linux traceroute allows default UDP as an unprivileged method, while some methods may require privileges depending on system configuration, so the row now reflects that nuance.
- The `traceroute -U` example described `-U` as the default UDP mode. The default traceroute method uses increasing UDP destination ports, while `-U` uses UDP to a fixed destination port, so the comment was corrected.
- The tracepath MTU section said tracepath tells you the MTU at each hop. tracepath reports Path MTU changes and summarizes the detected Path MTU, so the explanation was corrected.

## Review Notes
The remaining commands and flags reviewed are consistent with the referenced documentation: `dnf install traceroute`, `traceroute -n`, `-I`, `-T`, `-p`, `-m`, `-w`, `-q`, `tracepath -n`, `tracepath -6`, `tracepath -m`, `ip route get`, and `ping -M do -s 1472 -c 4`. Root requirements for ICMP/TCP traceroute can vary by Linux capabilities and sysctl settings; the examples keep `sudo` for those methods, which is a conservative choice on RHEL systems.
