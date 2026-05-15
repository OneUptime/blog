# Validation Summary: How to Secure Jenkins with SSL and Role-Based Access on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Jenkins
- Nginx
- SSL/TLS
- firewalld
- SELinux
- Jenkins Role-based Authorization Strategy plugin
- systemd

## Sources Consulted
- Jenkins official documentation: Reverse proxy configuration with Nginx - https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-with-jenkins/reverse-proxy-configuration-nginx/
- Jenkins official documentation: Linux installation packages - https://www.jenkins.io/doc/book/installing/linux/
- Jenkins official documentation: Initial settings and networking parameters - https://www.jenkins.io/doc/book/installing/initial-settings/
- Jenkins official documentation: Managing systemd services - https://www.jenkins.io/doc/book/system-administration/systemd-services/
- Jenkins plugin documentation: Role-based Authorization Strategy - https://plugins.jenkins.io/role-strategy
- firewalld official manual: firewall-cmd - https://firewalld.org/documentation/man-pages/firewall-cmd
- Red Hat documentation: RHEL 9 deploying web servers and reverse proxies - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_web_servers_and_reverse_proxies/deploying_web_servers_and_reverse_proxies
- Red Hat documentation: SELinux users and administrators guide - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/

## Issues Found
- The Jenkins localhost binding command edited `/etc/sysconfig/jenkins` and set `JENKINS_LISTEN_ADDRESS`, which is not the current documented approach for Jenkins Linux packages using systemd. Updated it to use a systemd drop-in with `JENKINS_OPTS=--httpListenAddress=127.0.0.1`, matching Jenkins' documented networking parameter and systemd override guidance.
- The Nginx reverse proxy example was missing Jenkins-recommended proxy settings for HTTP/1.1, WebSocket agents, and HTTP CLI requests. Added `keepalive`, the `$connection_upgrade` map, `proxy_http_version 1.1`, `Connection` and `Upgrade` headers, and `proxy_request_buffering off`, following Jenkins' official Nginx reverse proxy example.
- The proxy `Host` and forwarded protocol headers were made consistent with the Jenkins official example by using `$http_host` and `$scheme`.

## Review Notes
- The firewalld commands for opening HTTPS are valid for systems using firewalld.
- The SELinux `httpd_can_network_connect` boolean is consistent with Red Hat's RHEL 9 Nginx reverse proxy guidance.
- The Role-based Authorization Strategy plugin installation and item role pattern explanation are technically accurate. Future improvements could mention that item role patterns are regular expressions matched against full item names and are case-sensitive.
