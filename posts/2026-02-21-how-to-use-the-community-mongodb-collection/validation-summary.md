# Validation Summary: How to Use the community.mongodb Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.mongodb Ansible collection
- MongoDB
- PyMongo
- mongosh
- YAML playbooks

## Sources Consulted
- Ansible community.mongodb collection index: https://docs.ansible.com/projects/ansible/latest/collections/community/mongodb/index.html
- Ansible community.mongodb.mongodb_user module: https://docs.ansible.com/projects/ansible/latest/collections/community/mongodb/mongodb_user_module.html
- Ansible community.mongodb.mongodb_replicaset module: https://docs.ansible.com/projects/ansible/latest/collections/community/mongodb/mongodb_replicaset_module.html
- Ansible community.mongodb.mongodb_status module: https://docs.ansible.com/projects/ansible/latest/collections/community/mongodb/mongodb_status_module.html
- Ansible community.mongodb.mongodb_parameter module: https://docs.ansible.com/projects/ansible/latest/collections/community/mongodb/mongodb_parameter_module.html
- Ansible community.mongodb.mongodb_shard module: https://docs.ansible.com/projects/ansible/latest/collections/community/mongodb/mongodb_shard_module.html
- Ansible community.mongodb.mongodb_shard_zone module: https://docs.ansible.com/projects/ansible/latest/collections/community/mongodb/mongodb_shard_zone_module.html
- Ansible community.mongodb.mongodb_shell module: https://docs.ansible.com/projects/ansible/latest/collections/community/mongodb/mongodb_shell_module.html
- Ansible community.mongodb.mongodb_maintenance module: https://docs.ansible.com/projects/ansible/latest/collections/community/mongodb/mongodb_maintenance_module.html
- Ansible community.mongodb.mongodb_stepdown module: https://docs.ansible.com/projects/ansible/latest/collections/community/mongodb/mongodb_stepdown_module.html
- MongoDB server parameters: https://www.mongodb.com/docs/manual/reference/parameters/

## Issues Found
- The installation section implied that `pymongo` was the only runtime dependency. The collection docs require `pymongo` for most modules, while `mongodb_shell` requires `mongosh`; updated the wording and installation notes.
- The `mongodb_parameter` example used `slowOpThresholdMs` as a server parameter. Current MongoDB documentation treats slow operation threshold as profiling configuration rather than a general `setParameter` server parameter; replaced it with the documented `syncdelay` runtime parameter.
- The `mongodb_parameter` example labeled `wiredTigerEngineRuntimeConfig` as write concern configuration. This is not write concern, and the example value was not a reliable current runtime parameter example; replaced it with the documented `maxLogSizeKB` runtime parameter.
- The sharding section described a `mongodb_shard_zone` task as enabling database sharding. `mongodb_shard_zone` manages zones and ranges; updated the task name and added a `ranges` example. Added `sharded_databases: myapp` to the `mongodb_shard` task to match the collection's database sharding parameter.
- The `mongodb_shell` section referred generically to the mongo shell. The current module uses `mongosh` by default and deprecated `mongo` support; updated the wording.
- The `mongodb_maintenance` example used `state: present`, but the module uses the boolean `maintenance` parameter; changed it to `maintenance: true`.

## Review Notes
The `mongodb_shard` module documents `sharded_databases`, but also notes that starting in MongoDB 6.0 the `enableSharding` command is no longer required to shard a collection and that this parameter is ignored. Future revisions could mention this version-specific behavior explicitly.
