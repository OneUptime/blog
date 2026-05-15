# Validation Summary: How to Migrate from Debian to RHEL with Minimal Downtime

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Debian
- Red Hat Enterprise Linux
- systemd
- DNF
- Red Hat Subscription Manager
- rsync
- PostgreSQL streaming replication
- NetworkManager / nmcli
- firewalld
- nftables / iptables

## Sources Consulted
- Red Hat Enterprise Linux 8 Convert2RHEL documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/index
- Red Hat Enterprise Linux 9 DNF package installation documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 PostgreSQL documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/index
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Subscription Central registration documentation: https://docs.redhat.com/en/documentation/subscription_central/1-latest/html-single/getting_started_with_rhel_system_registration/index
- NetworkManager nmcli reference: https://www.networkmanager.dev/docs/api/latest/nmcli.html
- NetworkManager nm-settings-nmcli reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- PostgreSQL pg_basebackup documentation: https://www.postgresql.org/docs/current/app-pgbasebackup.html
- PostgreSQL pg_ctl documentation: https://www.postgresql.org/docs/current/app-pg-ctl.html
- Debian nftables documentation: https://wiki.debian.org/nftables
- Debian iptables documentation: https://wiki.debian.org/iptables/
- Local command help output for dpkg, systemctl, ss, and rsync.

## Issues Found
- The opening claim said Debian cannot be converted to RHEL in place. Red Hat's supported Convert2RHEL paths cover RHEL-derived distributions such as Alma Linux, CentOS Linux, Oracle Linux, and Rocky Linux, not Debian, so the wording was changed to "does not have a supported in-place conversion path" for precision.
- The RHEL PostgreSQL installation example installed `postgresql-server` but did not initialize the database cluster. Added `sudo postgresql-setup --initdb`, matching RHEL PostgreSQL documentation.
- The firewall note said Debian uses iptables directly. Current Debian releases use nftables as the default framework, while iptables may use the nftables backend. Updated the wording to say Debian commonly uses nftables or iptables.
- The cutover command stopped `httpd` on the Debian server, but Debian's Apache service is conventionally `apache2`. Changed the Debian stop command to `sudo systemctl stop apache2`.
- The RHEL service start command used `postgresql`. RHEL documentation uses `postgresql.service`; updated the command to make the service name explicit.

## Review Notes
- The PostgreSQL replication example is intentionally abbreviated. In a production migration, the source and target PostgreSQL major versions must be compatible, authentication and replication permissions must be prepared, the target data directory must be empty before `pg_basebackup`, and a tested failback plan should be in place.
- The `nmcli` example assumes the connection profile is named `System eth0`. Actual RHEL installations often use a different connection profile name, so operators should check `nmcli con show` first.
- The rsync examples are syntactically valid, but production migrations should consider ACLs, extended attributes, SELinux contexts, file ownership mappings, and application-level quiescing before the final sync.
