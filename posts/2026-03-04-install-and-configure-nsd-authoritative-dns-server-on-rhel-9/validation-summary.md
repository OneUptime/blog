# Validation Summary: How to Install and Configure NSD Authoritative DNS Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- NSD authoritative DNS server
- DNF and EPEL
- systemd
- firewalld
- DNS zone files

## Sources Consulted
- NSD `nsd.conf(5)` documentation: https://nsd.docs.nlnetlabs.nl/en/latest/manpages/nsd.conf.html
- NSD `nsd-checkconf(8)` documentation: https://nsd.docs.nlnetlabs.nl/en/latest/manpages/nsd-checkconf.html
- NSD `nsd-checkzone(8)` documentation: https://nsd.docs.nlnetlabs.nl/en/latest/manpages/nsd-checkzone.html
- NSD `nsd-control(8)` documentation: https://nsd.docs.nlnetlabs.nl/en/latest/manpages/nsd-control.html
- Fedora package listing for `nsd` in EPEL 9: https://packages.fedoraproject.org/pkgs/nsd/nsd/
- Red Hat guidance for enabling EPEL on RHEL 9: https://www.redhat.com/en/blog/install-epel-linux
- firewalld `firewall-cmd` manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The installation command used `<package-name>` instead of the actual `nsd` package. Updated the instructions to enable EPEL on RHEL 9 and install `nsd` plus `bind-utils` for `dig`.
- The configuration path used `/etc/<service>/config.conf`, which is not the NSD configuration file. Updated it to `/etc/nsd/nsd.conf`.
- The service commands used `<service-name>` placeholders. Updated them to use the actual systemd service name, `nsd`.
- The firewall instructions opened only a placeholder TCP port. DNS authoritative service must accept UDP and TCP on port 53, so the commands now open `53/udp` and `53/tcp`.
- The post did not include an NSD zone configuration or zone file, so the setup could not actually serve an authoritative zone. Added a minimal valid `nsd.conf` zone stanza and matching zone file.
- The verification and troubleshooting commands used placeholders and `curl`, which is not appropriate for testing DNS records. Updated verification to use `dig`, `nsd-checkconf`, `nsd-checkzone`, `journalctl -u nsd`, and `ss -tulnp`.

## Review Notes
The example domain and IP addresses use documentation-safe values. Production deployments should replace them with delegated domains and real authoritative name server addresses.
