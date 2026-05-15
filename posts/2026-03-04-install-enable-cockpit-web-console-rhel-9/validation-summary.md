# Validation Summary: How to Install and Enable the Cockpit Web Console on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit / RHEL web console
- systemd socket activation
- firewalld
- Cockpit TLS certificates
- Cockpit configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing systems using the RHEL 9 web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_systems_using_the_rhel_9_web_console/index
- Cockpit Project documentation: SSL/TLS Usage: https://cockpit-project.org/guide/latest/https.html
- Cockpit Project documentation: cockpit-tls(8): https://cockpit-project.org/guide/latest/cockpit-tls.8.html
- Cockpit Project documentation: cockpit.conf(5): https://cockpit-project.org/guide/latest/cockpit.conf.5.html
- Cockpit Project documentation: cockpit-ws(8): https://cockpit-project.org/guide/latest/cockpit-ws.8.html

## Issues Found
- The certificate installation example used `sudo cat ... > /etc/cockpit/ws-certs.d/your-cert.cert`. The redirection would be performed by the unprivileged shell, so the command can fail when writing to `/etc/cockpit/ws-certs.d/`. Changed it to run the full `cat` and redirection under `sudo sh -c`.
- The article said to restart `cockpit.socket` after installing a TLS certificate. Cockpit documentation describes certificate handling in the web service/TLS proxy path, and Red Hat documentation uses `systemctl restart cockpit` or `systemctl try-restart cockpit` for Cockpit configuration changes. Changed the command to `sudo systemctl restart cockpit`.
- The `IdleTimeout` example placed the setting under `[WebService]`. Red Hat and Cockpit documentation define idle timeout under `[Session]`. Moved `IdleTimeout = 15` into a `[Session]` section while leaving `LoginTitle` and `Origins` under `[WebService]`.

## Review Notes
The core installation flow is correct for RHEL 9: install `cockpit` when needed, enable `cockpit.socket`, open the `cockpit` firewalld service when required, and access the web console on TCP port 9090. Root login behavior is version-sensitive on RHEL 9.2 and later, but the post recommends logging in with a sudo-capable user, so no correction was required.
