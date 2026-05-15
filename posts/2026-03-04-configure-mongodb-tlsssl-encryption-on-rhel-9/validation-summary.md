# Validation Summary: How to Configure MongoDB TLS/SSL Encryption on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- MongoDB self-managed deployments
- MongoDB TLS/SSL configuration
- mongosh
- systemd
- firewalld
- SELinux

## Sources Consulted
- MongoDB Manual: Configure MongoDB Instances for TLS/SSL on Self-Managed Deployments: https://www.mongodb.com/docs/manual/tutorial/configure-ssl/
- MongoDB Manual: Self-Managed Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Shell Docs: mongosh Options: https://www.mongodb.com/docs/mongodb-shell/reference/options/
- MongoDB Manual v7.0: Install MongoDB Community Edition on Red Hat or CentOS: https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-red-hat/
- Red Hat Documentation: Using and configuring firewalld for RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld Manual Page: firewall-cmd: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The original service configuration commands used placeholders such as `/etc/<service>/config.conf` and `<service-name>`, which would not configure MongoDB. I replaced them with the MongoDB package configuration file `/etc/mongod.conf` and the `mongod` systemd service.
- The post did not include MongoDB TLS configuration fields. I added a minimal `net.tls` configuration using `mode: requireTLS`, `certificateKeyFile`, and `CAFile`, matching MongoDB's documented configuration format.
- The firewall example used the placeholder `<PORT>`. I changed it to MongoDB's default TCP port, `27017`, and kept the documented `firewall-cmd --permanent --add-port=27017/tcp` syntax.
- The verification command used `mongosh` without TLS options, which would fail once `requireTLS` is enabled. I updated it to use `--tls` and `--tlsCAFile`.
- The troubleshooting section used generic service and package placeholders. I replaced them with MongoDB-specific commands and added a certificate hostname/SAN note because `mongosh` validates the server certificate hostname for TLS connections.
- The prerequisites mentioned CentOS Stream 9 as equivalent to RHEL. I narrowed the stated platform to RHEL 9 and added MongoDB package and certificate prerequisites.

## Review Notes
The guide now provides a minimal server-side TLS configuration for MongoDB on RHEL. Production deployments should also review MongoDB authentication, bind IP exposure, certificate lifecycle management, and whether client certificate validation or x.509 authentication is required.
