# Validation Summary: How to Use Ansible to Configure MongoDB Replica Sets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- MongoDB 7.0
- MongoDB replica sets
- mongosh
- YAML configuration
- Ansible Vault

## Sources Consulted
- MongoDB 7.0 configuration file options: https://www.mongodb.com/docs/v7.0/reference/configuration-options/
- MongoDB internal membership authentication and keyfile requirements: https://www.mongodb.com/docs/manual/core/security-internal-authentication/
- MongoDB self-managed replica set deployment: https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set/
- MongoDB replica set with keyfile authentication: https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-with-keyfile-access-control/
- MongoDB hello command reference: https://www.mongodb.com/docs/manual/reference/command/hello/
- MongoDB mongosh methods reference: https://www.mongodb.com/docs/mongodb-shell/reference/methods/
- MongoDB rs.add() reference: https://www.mongodb.com/docs/current/reference/method/rs.add/
- MongoDB connection strings reference: https://www.mongodb.com/docs/current/reference/connection-string/
- MongoDB replica set oplog reference: https://www.mongodb.com/docs/manual/core/replica-set-oplog/
- Ansible include_tasks module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible task path resolution documentation: https://ansible.readthedocs.io/projects/ansible-core/devel/playbook_guide/playbook_pathing.html
- Ansible wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html

## Issues Found
- Removed `storage.journal.enabled` from the MongoDB 7.0 configuration template because MongoDB removed that configuration option starting in MongoDB 6.1.
- Replaced `db.isMaster().ismaster` with `db.hello().isWritablePrimary` because `hello` and `isWritablePrimary` are the current MongoDB primary-state API.
- Updated the `include_tasks` paths in the playbook from `roles/...` to `../roles/...` so the paths resolve correctly from a playbook stored in the `playbooks/` directory.
- Updated the `rs.add()` command to connect through a replica set seed URI with `replicaSet={{ mongodb_replset_name }}`. MongoDB requires `rs.add()` to run against the current primary, and the first inventory host may not be primary after failover.

## Review Notes
- The setup examples assume an initial deployment where the localhost exception is still available before the first admin user is created. A production role could be extended with separate authenticated rerun logic for fully idempotent post-bootstrap runs.
