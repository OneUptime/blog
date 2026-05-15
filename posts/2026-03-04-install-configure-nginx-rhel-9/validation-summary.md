# Validation Summary: How to Install and Configure Nginx on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- NGINX
- firewalld
- systemd
- SELinux
- DNF

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up and configuring NGINX": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx_deploying-web-servers-and-reverse-proxies
- Red Hat Enterprise Linux 9 documentation, "Using SELinux": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- firewalld documentation, "firewall-cmd" manual page: https://firewalld.org/documentation/man-pages/firewall-cmd
- NGINX documentation, "Serve Static Content": https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/
- NGINX documentation, "Configuring Logging": https://docs.nginx.com/nginx/admin-guide/monitoring/logging/

## Issues Found
- The SELinux section used `semanage` but did not ensure the package that provides it was installed. Added `sudo dnf install -y policycoreutils-python-utils` before the `semanage fcontext` command, matching Red Hat's documented requirement for SELinux file-context management commands.

## Review Notes
- Red Hat's NGINX guide commonly demonstrates opening ports with `firewall-cmd --add-port`, while this post uses the predefined `http` and `https` firewalld services. That is still technically valid because `firewall-cmd` supports adding services, and the standard firewalld service definitions map to the expected web ports.
- The `View active connections (requires stub_status)` line in the useful commands section is only a reminder, not a complete command. A future enhancement could add a short `stub_status` configuration example, but the current post does not configure that endpoint.
