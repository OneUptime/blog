# Validation Summary: How to Set Up a BIND DNS Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- BIND/named
- DNS forward and reverse zones
- firewalld
- systemd
- dig, named-checkconf, named-checkzone, and rndc

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up and configuring a BIND DNS server": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/assembly_setting-up-and-configuring-a-bind-dns-server_networking-infrastructure-services
- BIND 9.16 Administrator Reference Manual, configuration reference: https://bind9.readthedocs.io/en/v9.16.43/reference.html
- Local `dig -h` command output for query syntax.
- Red Hat Enterprise Linux 9 documentation, "Working with DNS in Identity Management", custom BIND logging and SELinux context handling: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/working_with_dns_in_identity_management/working_with_dns_in_identity_management

## Issues Found
- The post configured custom BIND logging under `/var/log/named/default.log` but only created and chowned the directory. On RHEL with SELinux enforcing, custom BIND log paths need appropriate SELinux labelling, while the RHEL BIND documentation uses `/var/named/log/` for file-based BIND logging examples. I changed the configured log path, file layout table, directory creation commands, and `tail` command to use `/var/named/log/default.log`.
- The post said BIND runs as the `named` user and changed zone file ownership to `named:named`. Red Hat's RHEL 9 BIND guidance recommends `root:named` ownership with mode `640` for primary zone files so `named` can read them without owning them. I updated the ownership and permission commands accordingly.
- The monitoring section called the configured log file a query log, but the sample configuration only logs the `default` category. I changed the label to "BIND logs" so it matches the configuration.

## Review Notes
The BIND configuration syntax, zone file examples, reverse zone name for `192.168.1.0/24`, `named-checkconf`, `named-checkzone`, `systemctl`, `firewall-cmd`, `dig`, and `rndc reload` commands are consistent with the referenced documentation. The exact RHEL package build can vary by minor release and errata, but RHEL 9 documents BIND 9.16.23 or later in the 9.16 series.
