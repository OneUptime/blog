# Validation Summary: How to Migrate from Ubuntu Server to RHEL Step by Step

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Ubuntu Server
- Red Hat Enterprise Linux
- Debian and RPM package management
- systemd
- Apache HTTP Server / httpd
- MariaDB / MySQL migration
- firewalld and UFW
- SELinux and AppArmor
- rsync, scp, ssh, mysqldump

## Sources Consulted
- Red Hat documentation: Convert2RHEL supported conversion paths, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/index
- Red Hat documentation: RHEL system registration and Simple Content Access, https://docs.redhat.com/en/documentation/subscription_central/1-latest/html/getting_started_with_rhel_system_registration/prep-reg-rhel
- Red Hat Customer Portal: Simple Content Access operational changes, https://access.redhat.com/articles/simple-content-access
- Red Hat documentation: RHEL 9 Apache HTTP Server configuration files, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-apache-http-server_deploying-web-servers-and-reverse-proxies
- Red Hat documentation: RHEL 9 SELinux contexts, booleans, and Apache examples, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- firewalld documentation: firewall-cmd manual and service examples, https://firewalld.org/documentation/man-pages/firewall-cmd and https://firewalld.org/documentation/howto/open-a-port-or-service
- Ubuntu documentation: Netplan overview, https://ubuntu.com/server/docs/explanation/networking/about-netplan/
- Ubuntu manpage: ufw status syntax, https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Ubuntu manpage: dpkg package selection reporting, https://manpages.ubuntu.com/manpages/kinetic/man1/dpkg.1.html

## Issues Found
- The RHEL registration example used `subscription-manager attach --auto` as a normal registration step. Red Hat Simple Content Access is now the default for new accounts and does not require subscription attachment, while entitlement-based attachment is deprecated. I changed the command block to register the system and show `attach --auto` only as an older entitlement-based-account option.
- The SELinux write-directory example recommended `setsebool -P httpd_can_network_connect on` for applications writing to non-standard directories. That boolean is for network connectivity, not writable file paths. I replaced it with persistent `semanage fcontext` labeling using `httpd_sys_rw_content_t` followed by `restorecon`.

## Review Notes
The guide is intentionally high-level. Database migration and Apache configuration migration can require application-specific changes, especially when moving between MySQL and MariaDB versions or translating Ubuntu Apache site layouts to RHEL's `/etc/httpd/conf.d/` model.
