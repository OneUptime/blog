# Validation Summary: How to Monitor Memcached Performance with memcached-tool on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Memcached
- memcached-tool
- systemd
- firewalld
- DNF/RPM package management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 documentation: Securing the Memcached service - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/securing_networks/Red_Hat_Enterprise_Linux-9-Securing_networks-en-US.pdf
- Red Hat Customer Portal: How to install and configure memcached - https://access.redhat.com/solutions/1160613
- Memcached documentation: TLS Support - https://docs.memcached.org/features/tls/
- Red Hat Enterprise Linux 9 documentation: Using and configuring firewalld - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The original post used unresolved placeholders such as `<package-name>`, `<service>`, and `/etc/<service>/config.conf`, so the commands would not work. Replaced them with the actual `memcached` package, `memcached` systemd service, and `/etc/sysconfig/memcached` configuration file.
- The original dependency installation used `epel-release` and `"Development Tools"`, which are not required for installing and monitoring Memcached from RHEL packages. Replaced them with `nmap-ncat` for the optional TCP verification command.
- The original verification command used `sudo <service> --test`, but Memcached does not provide that service test command. Replaced it with `memcached-tool 127.0.0.1:11211 stats`, `memcached-tool 127.0.0.1:11211 display`, and an `nc` stats query.
- The original firewall example used `--add-service=<service>`, but there is no generic `<service>` firewalld service for this post. Replaced it with `--add-port=11211/tcp` and added the caveat that Memcached should only be exposed to trusted private clients.
- The original monitoring and troubleshooting examples still referenced `<service>`. Replaced them with `memcached`, port `11211`, and `memcached-tool` commands.
- The security guidance was too generic. Updated it to reflect the packaged `memcached` user, interface binding, firewall restrictions, and TLS use when supported by clients.

## Review Notes
The post is now technically usable as a basic RHEL Memcached monitoring guide. Future improvements could include explaining key `memcached-tool stats` counters such as `get_hits`, `get_misses`, `evictions`, and `curr_connections`, but that was outside the requested correction scope.
