# Validation Summary: How to Install MongoDB Community Edition on RHEL

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- MongoDB Community Edition 7.0
- DNF/YUM package repositories
- systemd
- firewalld
- SELinux

## Sources Consulted
- MongoDB official documentation: Install MongoDB Community Edition on Red Hat or CentOS, version 7.0: https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-red-hat/
- MongoDB official documentation: Self-Managed Configuration File Options, version 7.0: https://www.mongodb.com/docs/v7.0/reference/configuration-options/
- MongoDB official documentation: Default MongoDB Port, version 7.0: https://www.mongodb.com/docs/v7.0/reference/default-mongodb-port/
- firewalld official documentation: firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd

## Issues Found
- The post used placeholder paths and service names such as `/etc/<service>/config.conf` and `<service-name>`, which would not work for a MongoDB package installation. Changed them to `/etc/mongod.conf` and `mongod`, matching MongoDB's official RHEL package documentation.
- The configuration guidance listed generic setting categories but not the actual MongoDB configuration keys. Changed the examples to `net.bindIp`, `security.authorization`, and `systemLog.path`, which are valid MongoDB configuration fields.
- The firewall example used a placeholder `<PORT>/tcp`. Changed it to `27017/tcp`, MongoDB's default port for `mongod`.
- Troubleshooting commands used placeholders for the systemd unit and package name. Changed them to `journalctl -u mongod -e --no-pager` and `rpm -qa | grep mongodb-org`.

## Review Notes
The MongoDB 7.0 repository stanza for RHEL 9, the GPG key URL, the package name `mongodb-org`, the `mongosh` verification command, and the RHEL/CentOS Stream 9 platform claim were consistent with MongoDB's official version 7.0 documentation. MongoDB 8.x is newer, but the 7.0 instructions remain technically valid for a guide that configures the 7.0 repository.
