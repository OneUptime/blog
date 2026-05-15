# Validation Summary: How to Deploy Apache Solr Search Platform on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- Apache Solr
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- systemd
- firewalld

## Sources Consulted
- Apache Solr Reference Guide: Installing Solr - https://solr.apache.org/guide/solr/latest/deployment-guide/installing-solr.html
- Apache Solr Reference Guide: Taking Solr to Production - https://solr.apache.org/guide/solr/latest/deployment-guide/taking-solr-to-production.html
- Red Hat Enterprise Linux 9 documentation: Using and configuring firewalld - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld documentation: firewall-cmd manual page - https://firewalld.org/documentation/man-pages/firewall-cmd

## Issues Found
- The post is placeholder content rather than a working Apache Solr deployment guide. It uses generic placeholders such as `/etc/<service>/config.conf`, `<service-name>`, `<PORT>`, and `<package-name>` instead of Solr-specific commands, paths, service names, or ports.
- The article starts at "Step 2" and does not include an actual Solr installation step. Official Solr documentation describes installing Solr as a service using the `install_solr_service.sh` script from the Solr distribution archive.
- The configuration path is incorrect for Solr. Solr service configuration is typically managed through `solr.in.sh` and service-specific installation paths, not `/etc/<service>/config.conf`.
- The service commands are not executable as written because `<service-name>` is never replaced with a real systemd unit such as `solr`.
- The firewall command is syntactically plausible for firewalld only after replacing `<PORT>` with a real TCP port, but the post does not identify Solr's default port, `8983`.
- No README changes were made because correcting the post would require replacing the placeholder with a substantive Solr deployment article, which is beyond a targeted technical correction.

## Review Notes
The post should be removed or rewritten from scratch as a real Solr-on-RHEL guide. A salvageable version should cover Java requirements, downloading a supported Solr release, installing `lsof` on Red Hat based systems before running the Solr service installer, using `install_solr_service.sh`, managing the `solr` systemd service, configuring Solr through the appropriate Solr environment files, and opening TCP port `8983` only when remote access is required.
