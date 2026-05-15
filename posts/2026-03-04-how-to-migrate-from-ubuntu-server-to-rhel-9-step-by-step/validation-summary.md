# Validation Summary: How to Migrate from Ubuntu Server to RHEL 9 Step by Step

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Ubuntu Server
- Red Hat Enterprise Linux 9
- DPKG package inventory
- systemd services
- Netplan
- NetworkManager and nmcli
- firewalld and firewall-cmd
- Apache HTTP Server/httpd
- MySQL/MariaDB
- PostgreSQL
- rsync

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Registering your system using the command line - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_over_the_network/registering-rhel-by-using-subscription-manager_rhel-installer
- Red Hat Enterprise Linux 9 documentation: Configuring an Ethernet connection by using nmcli - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-an-ethernet-connection_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation: Using and configuring firewalld - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Enterprise Linux 9 documentation: Setting up the Apache HTTP web server - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-apache-http-server_deploying-web-servers-and-reverse-proxies
- Red Hat Enterprise Linux 9 documentation: Configuring and using database servers - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/index
- Ubuntu Server documentation: About Netplan - https://ubuntu.com/server/docs/explanation/networking/about-netplan/

## Issues Found
- The package mapping listed the RHEL equivalent for Ubuntu `mysql-server` as `mysql or mariadb-server`. RHEL 9 documentation identifies MySQL and MariaDB server packages, and the MySQL server package name is `mysql-server`, while `mariadb-server` is the MariaDB server package. Changed the mapping to `mysql-server or mariadb-server`.
- The data migration example used `rsync` directly from `/var/lib/mysql/` to `/var/lib/mysql/`. Red Hat's database documentation notes that file-system-level database backups require the database service to be stopped for consistency and are specific to database version and architecture. Changed the general cross-distribution example to use a logical `mysqldump` export and `mysql` import.

## Review Notes
- The `nmcli`, `subscription-manager`, `firewall-cmd`, Apache `httpd`, Netplan, and service-verification examples are consistent with the referenced official documentation.
- Direct file-system database copies can still be valid in controlled same-engine migrations when the service is stopped and version/architecture requirements are met, but a logical dump is safer for a general Ubuntu-to-RHEL migration guide.
