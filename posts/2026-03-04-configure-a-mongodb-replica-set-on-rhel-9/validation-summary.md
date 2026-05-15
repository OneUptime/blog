# Validation Summary: How to Configure a MongoDB Replica Set on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- MongoDB
- MongoDB replica sets
- mongosh
- systemd
- firewalld
- SELinux

## Sources Consulted
- MongoDB Manual: Deploy a Self-Managed Replica Set - https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set/
- MongoDB Manual: Self-Managed Configuration File Options - https://www.mongodb.com/docs/v8.0/reference/configuration-options/
- MongoDB Manual: Install MongoDB Community Edition on Red Hat or CentOS - https://www.mongodb.com/docs/manual/administration/install-community/
- MongoDB Shell Docs: Install mongosh - https://www.mongodb.com/docs/mongodb-shell/install/
- Red Hat Enterprise Linux 9: Configuring firewalls and packet filters - https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- The MongoDB service commands used the placeholder `<service-name>`, which would not run as written. Changed them to `mongod`, the systemd service name used by MongoDB packages on RHEL-compatible systems.
- The firewall command used the placeholder `<PORT>`, which would not open MongoDB's default listener. Changed it to `27017/tcp`, matching the configured MongoDB port.
- The troubleshooting log command used `<service-name>`. Changed it to `journalctl -u mongod -e --no-pager`.
- The package verification command used `<package-name>`. Changed it to `rpm -qa | grep mongodb-org` for MongoDB Community Edition package verification.
- The example used `bindIp: 0.0.0.0`. While MongoDB supports binding to all IPv4 addresses, the official replica set deployment docs recommend binding to `localhost,<hostname>` and using DNS hostnames for replica set members. Changed the example to `localhost,<node-hostname>`.

## Review Notes
- The `rs.initiate()` example is syntactically valid and follows MongoDB's documented replica set configuration shape. It should be run on only one member after each `mongod` instance is configured with the same replica set name.
- For production deployments, MongoDB recommends securing publicly reachable instances with authentication and hardened network controls. The post mentions production caution generally, but a future revision could include MongoDB keyfile authentication.
