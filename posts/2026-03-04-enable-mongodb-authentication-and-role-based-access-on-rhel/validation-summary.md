# Validation Summary: How to Enable MongoDB Authentication and Role-Based Access on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- MongoDB Community/Enterprise self-managed deployments
- MongoDB authentication and role-based access control
- mongosh
- systemd
- firewalld
- SELinux troubleshooting

## Sources Consulted
- MongoDB Docs: Role-Based Access Control in Self-Managed Deployments - https://www.mongodb.com/docs/manual/core/authorization/
- MongoDB Docs: Enable Access Control on Self-Managed Deployments - https://www.mongodb.com/docs/manual/tutorial/enable-authentication/
- MongoDB Docs: Create a User on Self-Managed Deployments - https://www.mongodb.com/docs/manual/tutorial/create-users/
- MongoDB Docs: Users in Self-Managed Deployments - https://www.mongodb.com/docs/manual/core/security-users/
- MongoDB Docs: Self-Managed Configuration File Options - https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Docs: Install MongoDB Community Edition on Red Hat or CentOS - https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-red-hat/
- firewalld Documentation: firewall-cmd manual page - https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld Documentation: Reload firewalld - https://firewalld.org/documentation/howto/reload-firewalld.html

## Issues Found
- The post used placeholder paths and service names such as `/etc/<service>/config.conf` and `<service-name>`. Updated them to MongoDB's RHEL package defaults: `/etc/mongod.conf` and `mongod`.
- The post did not show how to enable MongoDB authorization. Added the required `security.authorization: enabled` configuration setting.
- The post did not create MongoDB users or assign roles, so it did not actually implement role-based access control. Added a `myUserAdmin` user with `userAdminAnyDatabase` and an example `appUser` with `readWrite` on a single database.
- The firewall example used `<PORT>` instead of MongoDB's default port. Updated it to `27017/tcp` and noted that it is only needed for remote clients.
- The verification command did not authenticate after access control was enabled. Updated it to connect with `-u`, `-p`, and the `admin` authentication database.
- Troubleshooting commands still referenced generic placeholders. Updated them to `mongod` and `mongodb-org`.

## Review Notes
The guide now covers the correct standalone MongoDB flow for RHEL-style packages: create an administrator, enable authorization in `/etc/mongod.conf`, restart `mongod`, and create least-privilege application users. For production deployments, the post could later be expanded with TLS, replica set keyfile authentication, and tighter network allowlisting, but those additions are outside this validation pass.
