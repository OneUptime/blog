# Validation Summary: How to Set Up the RHEL Web Console (Cockpit) After a Fresh Installation

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit / RHEL web console
- systemd socket activation
- firewalld
- SELinux port labeling
- Cockpit TLS certificates
- Certbot / Let's Encrypt
- SSH-based remote host management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing systems using the RHEL 9 web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/
- Red Hat Enterprise Linux 9 documentation: Installing and enabling the web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/getting-started-with-the-rhel-9-web-console_system-management-using-the-rhel-9-web-console
- Red Hat Enterprise Linux 9 documentation: Changing the web console listening port: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/getting-started-with-the-rhel-9-web-console_system-management-using-the-rhel-9-web-console
- Red Hat Enterprise Linux 9 documentation: Managing remote systems in the web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/managing-remote-systems-in-the-web-console_system-management-using-the-rhel-9-web-console
- Red Hat Enterprise Linux 9 documentation: Web console add-ons: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/cockpit-add-ons-_system-management-using-the-rhel-9-web-console
- Cockpit Project documentation: SSL/TLS usage: https://cockpit-project.org/guide/latest/https
- Cockpit Project documentation: cockpit.conf(5): https://cockpit-project.org/guide/latest/cockpit.conf.5
- Cockpit Project documentation: TCP port and address: https://cockpit-project.org/guide/latest/listen
- Cockpit Project documentation: Privileges and permissions: https://cockpit-project.org/guide/latest/privileges.html

## Issues Found
- The installation command included `cockpit-networkmanager`, which is not listed as a RHEL 9 web console add-on in Red Hat's RHEL 9 web console add-on documentation. Removed it from the command and package explanation.
- The login section implied that `wheel` membership is the only path to administrative tasks. Updated it to match Cockpit's privilege model: users log in with system credentials, and administrative actions depend on sudo or PolicyKit escalation.
- The certificate instructions used a combined certificate/private-key `.cert` file and `root:cockpit-ws` ownership. Updated the examples to the current Cockpit certificate/key pair layout, with a `.crt` certificate chain file and a matching unencrypted `.key` file protected as root-owned key material.
- The restart examples used `systemctl restart cockpit`. Updated configuration and certificate restarts to `systemctl try-restart cockpit`, matching Red Hat documentation for applying web console configuration without failing when the service is inactive.
- The port-change procedure omitted SELinux labeling. Added `semanage port -m -t websm_port_t -p tcp 443`, which is required for Cockpit to bind to port 443 on SELinux-enforcing RHEL systems.
- The architecture overview said `cockpit-ws` handles HTTPS directly. Updated it to include `cockpit-tls`, which terminates TLS and proxies to `cockpit-ws` in current Cockpit.
- The multiple-server section said each remote server needs the Cockpit socket enabled and port 9090 opened. Corrected it to match Red Hat's remote-host model: the primary web console host connects to managed systems over SSH, and the remote systems need the Cockpit system package plus reachable SSH.
- The certificate troubleshooting command used `remotectl certificate`. Updated it to `/usr/libexec/cockpit-certificate-ensure --check`, which current Cockpit documentation recommends for checking which certificate Cockpit will use.

## Review Notes
The post is technically relevant and has been corrected for current RHEL 9/Cockpit behavior. The example changes Cockpit to port 443; this is valid only when no other local service uses that port, as the post already notes.
