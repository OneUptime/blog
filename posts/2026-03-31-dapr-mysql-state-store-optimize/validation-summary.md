# Validation Summary: How to Optimize MySQL as Dapr State Store

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (state store component)
- MySQL (InnoDB engine)
- ProxySQL (connection pooling)
- Kubernetes (secrets, component deployment)
- Python Dapr SDK (transactional state operations)

## Sources Consulted
- Dapr MySQL state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-mysql/
- Dapr components-contrib MySQL source code: https://github.com/dapr/components-contrib/tree/master/state/mysql
- Dapr components-contrib MySQL metadata.yaml: https://raw.githubusercontent.com/dapr/components-contrib/master/state/mysql/metadata.yaml
- Dapr Python SDK source (_request.py): https://raw.githubusercontent.com/dapr/python-sdk/master/dapr/clients/grpc/_request.py
- Dapr Python SDK source (client.py): https://raw.githubusercontent.com/dapr/python-sdk/master/dapr/clients/grpc/client.py
- MySQL 8.0 InnoDB parameters reference: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 buffer pool resize documentation: https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool-resize.html
- MySQL 8.0 thread pool installation docs: https://dev.mysql.com/doc/refman/8.0/en/thread-pool-installation.html

## Issues Found

1. **Wrong TTL column name in schema SQL**: The post referenced `expiredAt` as the Dapr state table TTL column. The actual column name created by Dapr is `expiredate`, confirmed in the components-contrib MySQL source code. Fixed the `CREATE INDEX` statement to use the correct column name and updated the index name accordingly.

2. **Incorrect Python SDK import path and enum name**: The post imported `TransactionalStateOperation` and `OperationType` from `dapr.clients.grpc._state`. The correct import path is `dapr.clients.grpc._request`, and the enum is named `TransactionOperationType` (not `OperationType`). Fixed both the import statement and all usages of the enum in the code example.

3. **`innodb_buffer_pool_instances` shown as dynamic SET GLOBAL**: The post used `SET GLOBAL innodb_buffer_pool_instances = 4;` implying it can be changed at runtime. This variable is **not dynamic** in MySQL — it must be set in the configuration file and requires a server restart. Replaced the SET GLOBAL statement with a comment explaining it must be set in my.cnf.

4. **`thread_pool_size` not available in MySQL Community Edition**: The post included `thread_pool_size = 16` in the my.cnf configuration without noting that the thread pool plugin is a MySQL Enterprise Edition feature only. Commented out the setting and added a note about the Enterprise Edition requirement.

## Review Notes
- `innodb_log_file_size` is deprecated in MySQL 8.0.30+ in favor of `innodb_redo_log_capacity`. The post correctly notes it requires a restart, but users on MySQL 8.0.30+ should use the newer parameter instead. This was not changed since the post doesn't target a specific MySQL version.
- The ProxySQL configuration is syntactically correct for ProxySQL's admin interface. The query routing rule `'^SELECT'` to a different hostgroup is a standard read/write split pattern.
- The Dapr component YAML is correct: `state.mysql` v1 with proper secretKeyRef usage and valid metadata field names.
- The `cleanupInterval` metadata field correctly uses duration format (`"1h"`), confirmed against the Dapr source code and metadata.yaml.
