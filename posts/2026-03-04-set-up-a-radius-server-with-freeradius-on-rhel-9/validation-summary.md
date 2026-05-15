# Validation Summary: How to Set Up a RADIUS Server with FreeRADIUS on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- FreeRADIUS
- systemd
- firewalld
- SELinux troubleshooting tools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing networking": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- Red Hat Enterprise Linux 9 documentation, "Configuring firewalls and packet filters": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- FreeRADIUS documentation, "Client Definitions": https://www.freeradius.org/documentation/freeradius-server/4.0.0/reference/raddb/clients.conf.html
- FreeRADIUS documentation, "Adding a new user to the server": https://www.freeradius.org/documentation/freeradius-server/4.0.0/tutorials/new_user.html
- FreeRADIUS documentation, "RADIUS Sessions": https://www.freeradius.org/documentation/freeradius-server/4.0.0/concepts/session/radius_session.html
- FreeRADIUS radtest manual page: https://www.freeradius.org/radiusd/man/radtest.html

## Issues Found
- The post used placeholder paths such as `/etc/<service>/config.conf`, placeholder service names, and placeholder package names. Replaced them with RHEL/FreeRADIUS-specific values: `/etc/raddb/clients.conf`, `radiusd`, and `freeradius`.
- The firewall example opened a placeholder TCP port. RADIUS authentication and accounting use UDP ports 1812 and 1813, and Red Hat documents opening them with `firewall-cmd --permanent --add-service=radius`, so the firewall command was corrected.
- The post claimed to cover setup from initial installation but did not include an installation step. Added a minimal FreeRADIUS package installation command using `dnf install freeradius freeradius-utils`.
- Added a minimal `clients.conf` client example with `ipaddr` and `secret`, matching FreeRADIUS client configuration syntax.
- Added a minimal local test user in `/etc/raddb/mods-config/files/authorize` so the `radtest` verification command has a configured user to authenticate.
- Added `radiusd -XC` before restart to validate configuration, matching Red Hat's documented verification step.
- Replaced generic verification commands with `radiusd` journal checks and a `radtest` example using the documented `radtest` argument order.

## Review Notes
The post now covers a basic local FreeRADIUS setup. A production deployment should expand the authentication backend details, avoid example shared secrets, and configure EAP, LDAP, IdM, or another backend according to the environment.
