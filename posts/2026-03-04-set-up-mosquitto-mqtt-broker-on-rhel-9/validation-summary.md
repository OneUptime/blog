# Validation Summary: How to Set Up Mosquitto MQTT Broker on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Eclipse Mosquitto MQTT broker
- EPEL and DNF
- systemd
- firewalld

## Sources Consulted
- Eclipse Mosquitto configuration manual: https://mosquitto.org/man/mosquitto-conf-5.html
- Eclipse Mosquitto authentication methods: https://mosquitto.org/documentation/authentication-methods/
- Eclipse Mosquitto mosquitto_pub manual: https://mosquitto.org/man/mosquitto_pub-1.html
- Eclipse Mosquitto mosquitto_sub manual: https://mosquitto.org/man/mosquitto_sub-1.html
- Fedora EPEL 9 Mosquitto package listing: https://packages.fedoraproject.org/pkgs/mosquitto/mosquitto/epel-9.html
- Red Hat EPEL installation guidance for RHEL 9: https://www.redhat.com/en/blog/install-epel-linux
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- systemd systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html

## Issues Found
- The post used generic placeholders such as `/etc/<service>/config.conf`, `<service-name>`, `<PORT>`, and `<package-name>` instead of working Mosquitto values. Replaced them with `/etc/mosquitto/mosquitto.conf`, the `mosquitto` service name, port `1883/tcp`, and Mosquitto package checks.
- The post claimed to cover setup from installation but did not include installation commands. Added RHEL 9 and CentOS Stream 9 installation steps using EPEL/CRB guidance and the EPEL Mosquitto package.
- The configuration section did not include a valid Mosquitto configuration snippet. Added a minimal listener, password file, anonymous-access, and syslog configuration using supported Mosquitto options.
- The verification section only checked generic service status and logs. Replaced it with Mosquitto-specific status/log commands and a local publish/subscribe test using `mosquitto_sub` and `mosquitto_pub`.

## Review Notes
For production deployments, the post could later be expanded with TLS listener configuration, ACLs, and SELinux-specific notes. Those additions are outside this validation because the requested changes were limited to technical corrections.
