# Validation Summary: How to Set Up Knot DNS Server on RHEL

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Knot DNS
- systemd
- firewalld
- SELinux troubleshooting tools

## Sources Consulted
- Knot DNS official configuration documentation: https://www.knot-dns.cz/docs/latest/html/configuration.html
- Knot DNS official operation documentation: https://www.knot-dns.cz/docs/latest/html/operation.html
- Fedora Packages entry for Knot DNS in EPEL 9: https://packages.fedoraproject.org/pkgs/knot/knot/
- Red Hat blog documentation for installing EPEL on RHEL and CentOS Stream: https://www.redhat.com/en/blog/install-epel-linux
- firewalld official firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The post uses placeholder paths and service names such as `/etc/<service>/config.conf` and `<service-name>` instead of Knot DNS paths and units. Knot DNS uses a Knot-specific configuration file such as `/etc/knot/knot.conf`, and the daemon is managed through Knot/systemd tooling rather than placeholder names.
- The post omits the actual installation step even though it claims to cover installation. Knot DNS is available for RHEL 9 through EPEL, so a correct guide would need repository enablement and `dnf install knot` instructions.
- The firewall section uses `<PORT>/tcp` only. DNS service exposure normally requires port 53 for both UDP and TCP, or the firewalld `dns` service where appropriate.
- Verification and troubleshooting commands use placeholders such as `<service-name>` and `<package-name>`, so the commands cannot be run as written and do not validate a Knot DNS installation.
- Because the article is largely a generic service-setup template rather than a Knot DNS setup guide, fixing it would require replacing most of the technical content instead of making targeted corrections.

## Review Notes
The post should be rewritten before publication as a real Knot DNS on RHEL 9 guide. A future version should include EPEL enablement, Knot package installation, a minimal valid `knot.conf`, zone file creation, configuration validation, service management, DNS firewall rules for UDP/TCP 53, and DNS query verification with tools such as `dig`.
