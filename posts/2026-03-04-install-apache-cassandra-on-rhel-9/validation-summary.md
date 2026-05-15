# Validation Summary: How to Install Apache Cassandra on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Apache Cassandra
- DNF/YUM RPM repositories
- systemd service management
- firewalld

## Sources Consulted
- Apache Cassandra installation documentation: https://cassandra.apache.org/doc/stable/cassandra/installing/installing.html
- Apache Cassandra configuration documentation: https://cassandra.apache.org/doc/latest/cassandra/getting-started/configuring.html
- Apache Cassandra `cassandra.yaml` reference: https://cassandra.apache.org/doc/stable/cassandra/managing/configuration/cass_yaml_file.html
- Apache Cassandra RPM repository metadata: https://redhat.cassandra.apache.org/50x/repodata/repomd.xml
- Red Hat Enterprise Linux 9 DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 OpenJDK notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/considerations_in_adopting_rhel_9/considerations_in_adopting_rhel_9
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld `firewall-cmd` manual: https://firewalld.org/documentation/man-pages/firewall-cmd

## Issues Found
- The post used placeholder package commands with `<package-name>`, which would not install Apache Cassandra. Replaced them with Java installation, Cassandra RPM repository setup, and `sudo dnf install -y cassandra`.
- The post referenced a generic configuration path `/etc/<service>/config.conf`. Replaced it with the Cassandra RPM configuration file path `/etc/cassandra/default.conf/cassandra.yaml`.
- The post referenced generic service commands with `<service-name>`. Replaced them with `cassandra` service commands.
- The firewall example used a placeholder `<PORT>`. Replaced it with Cassandra's default CQL native transport port, `9042/tcp`, and noted that it should be opened only for trusted clients.
- The verification and troubleshooting commands were generic and did not verify Cassandra. Added `nodetool status`, `cqlsh`, and `/var/log/cassandra/system.log` checks.

## Review Notes
The corrected post now targets the current Apache Cassandra 5.0 RPM repository. For production use, administrators should confirm the exact Cassandra release series they want to run and pin or manage package upgrades according to their operational policy.
