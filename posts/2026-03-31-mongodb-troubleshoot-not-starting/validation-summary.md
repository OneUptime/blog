# Validation Summary: How to Troubleshoot MongoDB Not Starting

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MongoDB (mongod daemon, WiredTiger storage engine)
- Linux system administration (systemd, file permissions, ulimits)
- YAML configuration format

## Sources Consulted
- [mongod Command-Line Options — MongoDB Documentation](https://www.mongodb.com/docs/manual/reference/program/mongod/)
- [MongoDB Configuration File Options](https://www.mongodb.com/docs/manual/reference/configuration-options/)
- [SERVER-41903: validate option to validate config file and command line only](https://jira.mongodb.org/browse/SERVER-41903)
- [Run-time Database Configuration — MongoDB Documentation](https://www.mongodb.com/docs/manual/administration/configuration/)

## Issues Found
- **`--configTest` is not a valid mongod flag**: Step 4 and the Summary referenced `mongod --config /etc/mongod.conf --configTest` for validating the configuration file. This flag does not exist. The correct option is `--validate`, which was introduced in MongoDB 4.2 (tracked in SERVER-41903). Both occurrences were corrected to `--validate`.

## Review Notes
- The `mongodb:mongodb` user/group used in the `chown` commands (Step 3) is correct for Debian/Ubuntu packages. On RHEL/CentOS, the default user and group is `mongod:mongod`. The post targets Linux generically, so readers on RHEL-based systems should adjust accordingly.
- Step 7 comments say "Start in foreground" but if the config file includes `processManagement.fork: true` (as shown in the Step 4 sample), mongod will still fork to the background. Users wanting true foreground output should temporarily comment out the `fork: true` line or use a separate config file without it.
- Using `kill -9` (SIGKILL) in Step 2 is appropriate only for truly stale processes. For a running mongod, `kill -2` (SIGINT) or `mongod --shutdown` is the recommended graceful shutdown method. The post does qualify this with "if it is a stale mongod," which is acceptable.
- The recommended file descriptor limit of 64000 is consistent with current MongoDB documentation.
