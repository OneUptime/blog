# Validation Summary: How to Set Up Suricata with EVE JSON Logging for SIEM Integration on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Suricata
- EVE JSON logging
- OISF COPR RPM packages
- systemd
- firewalld
- SIEM log forwarding

## Sources Consulted
- Suricata RPM installation documentation: https://docs.suricata.io/en/latest/install/rpm.html
- Suricata command-line options documentation: https://docs.suricata.io/en/latest/command-line-options.html
- Suricata EVE JSON output documentation: https://docs.suricata.io/en/latest/output/eve/eve-json-output.html
- Suricata rule management with suricata-update documentation: https://docs.suricata.io/en/latest/rule-management/suricata-update.html
- Red Hat EPEL guidance: https://access.redhat.com/solutions/3358
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The installation commands used placeholders (`<package-name>`) and did not install Suricata. Replaced them with the OISF-documented RHEL/RPM flow using `epel-release`, `dnf-plugins-core`, the `@oisf/suricata-8.0` COPR repository, and `dnf install suricata`.
- The service configuration path used a placeholder (`/etc/<service>/config.conf`). Replaced it with Suricata's packaged configuration file, `/etc/suricata/suricata.yaml`, and added a valid `eve-log` YAML example.
- The service start, status, test, and journal commands used placeholders or invalid Suricata syntax. Replaced them with `suricata-update`, `systemctl enable --now suricata`, `suricata -T -c /etc/suricata/suricata.yaml`, and Suricata-specific log checks.
- The firewall example attempted to add a nonexistent generic service. Updated the text to clarify that passive IDS mode does not need an inbound firewalld service rule and provided a valid example for allowing a syslog-over-TLS forwarding port when applicable.
- The troubleshooting section still referenced `<service>`. Replaced it with `suricata`.

## Review Notes
The guide now uses Suricata 8 RPM installation paths and behavior from the current OISF documentation. The capture interface example uses `eth0`; readers must replace it with the actual interface name on their RHEL host.
