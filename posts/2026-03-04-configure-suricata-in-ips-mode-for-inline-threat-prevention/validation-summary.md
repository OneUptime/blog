# Validation Summary: How to Configure Suricata in IPS Mode for Inline Threat Prevention on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Suricata
- IPS/inline mode
- systemd
- firewalld
- DNF/RPM packaging

## Sources Consulted
- Suricata official RPM installation documentation: https://docs.suricata.io/en/latest/install/rpm.html
- Suricata official IPS/inline mode documentation for Linux: https://docs.suricata.io/en/latest/ips/setting-up-ipsinline-for-linux.html
- Suricata official command-line/man page documentation: https://docs.suricata.io/en/latest/manpages/suricata.html
- Red Hat official firewall and packet filtering documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/configuring_firewalls_and_packet_filters/index

## Issues Found
- The post is a generic placeholder rather than a real Suricata IPS tutorial. It uses unresolved placeholders such as `<package-name>`, `<service>`, and `/etc/<service>/config.conf`, so the commands cannot be executed as written.
- The installation section does not install Suricata. Official OISF RPM guidance for Enterprise Linux uses `epel-release`, `dnf-plugins-core`, an OISF COPR repository such as `@oisf/suricata-8.0`, and `dnf install suricata`.
- The configuration section does not reference Suricata's real configuration paths. The official RPM documentation lists `/etc/suricata` as the configuration directory and `/etc/suricata/suricata.yaml` as the default configuration file.
- The IPS instructions do not configure an inline packet path. Official Suricata documentation requires a supported inline method such as NFQUEUE with `suricata -c /etc/suricata/suricata.yaml -q 0` and matching Netfilter rules, or AF_PACKET IPS mode with paired interfaces using `copy-mode: ips` and `copy-iface`.
- The service commands use `<service>` rather than the actual `suricata` systemd unit documented for RPM installations.
- The verification command `sudo <service> --test` is invalid for Suricata. Suricata uses `-T` to test configuration, for example with `-c /etc/suricata/suricata.yaml`.
- The firewall section incorrectly implies a firewalld service entry is sufficient for IPS mode. Inline prevention requires queueing or bridging traffic through Suricata, not merely opening a service in the host firewall.

## Review Notes
The post should be removed or replaced with a real Suricata IPS guide. A technically valid replacement should choose one inline model, such as NFQUEUE for layer 3 integration or AF_PACKET for a two-interface layer 2 bridge, and provide commands and configuration that match that model.
