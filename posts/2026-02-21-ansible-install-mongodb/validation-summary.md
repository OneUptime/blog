# Validation Summary: How to Use Ansible to Install MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- MongoDB Community Edition 7.0
- Ubuntu and Debian APT repositories
- RHEL/Rocky Linux YUM/DNF repositories
- MongoDB configuration
- MongoDB authentication and users

## Sources Consulted
- MongoDB Docs: Install MongoDB Community Edition on Ubuntu 7.0: https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-ubuntu/
- MongoDB Docs: Install MongoDB Community Edition on Debian 7.0: https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-debian/
- MongoDB Docs: Install MongoDB Community Edition on Red Hat or CentOS 7.0: https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-red-hat/
- MongoDB Docs: Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Docs: Localhost Exception: https://www.mongodb.com/docs/v8.0/core/localhost-exception/
- Ansible Docs: ansible.builtin.apt_key module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible Docs: community.mongodb.mongodb_user module: https://docs.ansible.com/ansible/latest/collections/community/mongodb/mongodb_user_module.html

## Issues Found
- The post claimed Debian support but the APT repository snippet always used the Ubuntu repository URL. I split the APT repository task into separate Ubuntu and Debian repository definitions using the official MongoDB repository paths and suites.
- The APT key task used `apt_key`, which depends on the deprecated `apt-key` utility. I changed it to place the MongoDB signing key in `/usr/share/keyrings` and reference it with `signed-by`.
- The RHEL package list included `mongodb-org-shell`, which is not listed in MongoDB's RHEL 7.0 package installation examples. I replaced it with the documented RHEL component package names.
- The authentication task label said authentication was disabled initially, but the role enables authorization in `mongod.conf` before creating the first user. I updated the label to reflect MongoDB's localhost exception.
- The WiredTiger cache explanation omitted MongoDB's documented 256MB minimum and recommended a 10GB cache on a 16GB dedicated host, which is above the default MongoDB advises not to increase casually. I corrected the default formula and adjusted the example.
- The conclusion described the repository as installing the latest stable version, while the role pins a selected release series such as 7.0. I changed the wording to "selected release series."

## Review Notes
The role remains a tutorial example rather than a production-hardened role. Future improvements could include explicit supported distribution/version guards, SELinux notes for RHEL, and installing a PyMongo 4-compatible package source when the application-user examples are used with `community.mongodb`.
