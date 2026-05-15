# Validation Summary: How to Deploy Apache Pulsar on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- Apache Pulsar
- Red Hat Enterprise Linux 9
- systemd
- firewalld

## Sources Consulted
- Apache Pulsar documentation: Deploy a cluster on bare metal, https://pulsar.apache.org/docs/3.1.x/deploy-bare-metal/
- Apache Pulsar documentation: Run a standalone Pulsar cluster locally, https://pulsar.apache.org/docs/2.11.x/getting-started-standalone/
- Red Hat Enterprise Linux 9 documentation: Using and configuring firewalld, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld documentation: firewall-cmd manual page, https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The post is a placeholder and does not provide a usable Apache Pulsar deployment procedure. It starts at "Step 2" and omits the actual Pulsar installation/download and startup steps documented by Apache Pulsar.
- The commands use unresolved placeholders such as `/etc/<service>/config.conf`, `<service-name>`, `<PORT>`, and `<package-name>`, so they cannot be executed as written.
- The configuration path is incorrect for Apache Pulsar. The official binary distribution uses configuration files under the Pulsar installation directory, such as `conf/broker.conf`, rather than `/etc/<service>/config.conf` by default.
- The systemd commands are generic and do not correspond to a Pulsar unit installed by the official Pulsar binary distribution. Apache Pulsar documents commands such as `bin/pulsar-daemon start standalone` for a local standalone service and separate service processes for cluster deployment.
- No README.md changes were made because correcting the article would require writing a new deployment guide rather than fixing isolated technical inaccuracies.

## Review Notes
This post should be removed or replaced with a complete Apache Pulsar on RHEL guide. A replacement should specify the intended deployment mode, such as standalone or a multi-node cluster, and include versioned Pulsar download, Java/runtime requirements, Pulsar configuration files, startup commands or a real systemd unit, and the specific ports required for the selected deployment.
