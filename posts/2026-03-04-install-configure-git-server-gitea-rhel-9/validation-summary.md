# Validation Summary: How to Install and Configure Git Server with Gitea on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Gitea
- Git
- PostgreSQL
- systemd
- firewalld
- Nginx
- SELinux

## Sources Consulted
- Gitea Installation from binary: https://docs.gitea.com/installation/install-from-binary
- Gitea Run as a Linux service: https://docs.gitea.com/installation/linux-service
- Gitea Database Preparation: https://docs.gitea.com/1.23/installation/database-prep
- Gitea Reverse Proxies: https://docs.gitea.com/1.24/administration/reverse-proxies
- Gitea download version metadata: https://dl.gitea.com/gitea/version.json
- Red Hat Enterprise Linux 9 PostgreSQL documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/configuring_and_using_database_servers/using-postgresql_configuring-and-using-database-servers
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux

## Issues Found
- The prerequisite package list did not include `wget`, even though the binary installation step uses it. I added `wget` to the prerequisite install command.
- The SELinux section uses `semanage`, which is provided by `policycoreutils-python-utils` on RHEL-family systems. I added that package to the prerequisite install command so the later command is available.
- The Gitea download section described downloading the latest Gitea binary but pinned `1.21.4`, which is outdated. I updated the example to `1.26.1`, matching the current official Gitea download metadata checked during review.
- The PostgreSQL authentication edit changed only `local` socket rules to `md5`, but the installation form tells users to connect to `127.0.0.1:5432`, which uses a `host` rule. I replaced it with a `host giteadb gitea 127.0.0.1/32 scram-sha-256` rule and set `password_encryption` to `scram-sha-256` before creating the role, matching Gitea's PostgreSQL guidance and the connection host shown in the post.

## Review Notes
The Nginx reverse proxy, systemd service shape, firewalld commands, Gitea directory permissions, and post-install `/etc/gitea` permission tightening align with the referenced documentation. A future improvement would be to add binary signature verification, which Gitea recommends, but the omission does not make the existing commands incorrect.
