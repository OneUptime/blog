# Validation Summary: What Is MySQL Router

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MySQL Router
- MySQL InnoDB Cluster
- MySQL InnoDB ClusterSet
- MySQL InnoDB ReplicaSet
- MySQL Connector/Python (`mysql.connector`)
- X Protocol

## Sources Consulted
- MySQL Router 8.4 Reference Manual (https://dev.mysql.com/doc/mysql-router/8.4/en/)
- MySQL Router REST API documentation (https://dev.mysql.com/doc/mysql-router/8.4/en/mysql-router-rest-api.html)
- MySQL Router bootstrapping documentation (https://dev.mysql.com/doc/mysql-router/8.4/en/mysql-router-deploying-bootstrapping.html)
- MySQL Router configuration documentation (https://dev.mysql.com/doc/mysql-router/8.4/en/mysql-router-configuration.html)
- MySQL Connector/Python API reference (https://dev.mysql.com/doc/connector-python/en/)

## Issues Found
1. **REST API URL used `http://` instead of `https://`**: The `curl` command for the Router REST API used `http://router-host:8443/api/20190715/routes`. MySQL Router's REST API uses HTTPS by default on port 8443 with a self-signed TLS certificate. Changed to `curl -k https://router-host:8443/api/20190715/routes` (the `-k` flag is needed to accept the self-signed certificate).

## Review Notes
- The "Connection multiplexing" key feature uses different terminology than the official MySQL documentation, which calls this feature "connection sharing." The concept described is accurate, but readers looking up the feature in official docs should search for "connection sharing" instead.
- The REST API version path `20190715` is the original API version. Newer versions of MySQL Router may support additional API versions, but this path remains valid.
- The `auth_cache_ttl = -1` value in the configuration example means the auth cache TTL is derived from the metadata `ttl` value, which is the default behavior. This is correct.
- The bootstrapping command uses `--directory` which creates a self-contained Router installation in the specified path. This is one of two deployment approaches (the other being system-wide installation). The example is valid for both approaches.
- All default port numbers (6446-6449) are correct for the classic protocol and X Protocol read/write and read-only routing.
