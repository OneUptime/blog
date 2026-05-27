# Validation Summary: How to Use Ansible to Create MongoDB Users

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy collections
- Ansible Vault
- `community.mongodb` Ansible collection
- MongoDB users, roles, and replica sets
- MongoDB Shell (`mongosh`)
- PyMongo

## Sources Consulted
- Ansible `community.mongodb.mongodb_user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/mongodb/mongodb_user_module.html
- Ansible `community.mongodb.mongodb_role` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/mongodb/mongodb_role_module.html
- Ansible `community.mongodb.mongodb_shell` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/mongodb/mongodb_shell_module.html
- Ansible `community.mongodb` collection index and supported Ansible versions: https://docs.ansible.com/projects/ansible/latest/collections/community/mongodb/index.html
- Ansible Vault documentation: https://docs.ansible.com/projects/ansible/6/user_guide/vault.html
- MongoDB `db.createRole()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.createrole/
- MongoDB privilege actions documentation: https://www.mongodb.com/docs/manual/reference/privilege-actions/
- MongoDB built-in roles documentation: https://www.mongodb.com/docs/current/reference/built-in-roles/
- MongoDB replica set replication documentation: https://www.mongodb.com/docs/current/replication/

## Issues Found
- The prerequisite listed "Ansible 2.9+", but the current `community.mongodb` collection documentation specifies support for Ansible 2.9.10 or newer. Updated the prerequisite to "Ansible 2.9.10+".
- The post uses `community.mongodb.mongodb_shell`, whose official requirements include `mongosh`, but the prerequisites did not mention it. Added `mongosh` as a target-host prerequisite for shell tasks.
- The custom role example used `community.mongodb.mongodb_shell` with `db.createRole()` plus `ignore_errors: true`. The `community.mongodb` collection provides the idempotent `mongodb_role` module for this use case, so the example was changed to use `community.mongodb.mongodb_role`.
- The custom role example included `aggregate` as a privilege action. MongoDB's documented privilege actions do not include a standalone `aggregate` action for normal aggregation; the `find` action permits aggregation except for specific stages such as `$out`. Removed the invalid `aggregate` action and kept `find`.
- The production tip said MongoDB authenticates against the `admin` database by default. That is too broad and can be misleading because authentication source depends on the client/module configuration. Reworded it to say to use `login_database: admin` when the administrative login user was created in the `admin` database.

## Review Notes
The examples are now aligned with the current `community.mongodb` module documentation and MongoDB authorization docs. The post still assumes a simplified self-managed MongoDB deployment; production deployments may also need TLS options, replica set connection options, explicit auth mechanisms, or `update_password` behavior depending on local policy.
