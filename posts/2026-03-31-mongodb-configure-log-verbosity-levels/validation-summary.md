# Validation Summary: How to Configure MongoDB Log Verbosity Levels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (server configuration and diagnostics)
- mongod.conf (YAML configuration file)
- mongosh (MongoDB Shell)
- systemd (service management)

## Sources Consulted
- MongoDB Manual: Log Messages — https://www.mongodb.com/docs/manual/reference/log-messages/
- MongoDB Manual: db.setLogLevel() — https://www.mongodb.com/docs/manual/reference/method/db.setLogLevel/
- MongoDB Manual: db.getLogComponents() — https://www.mongodb.com/docs/manual/reference/method/db.getLogComponents/
- MongoDB Manual: getLog command — https://www.mongodb.com/docs/manual/reference/command/getLog/
- MongoDB Manual: Configuration File Options (systemLog) — https://www.mongodb.com/docs/manual/reference/configuration-options/#systemlog-options

## Issues Found
No technical issues found.

## Review Notes
- The `systemLog.verbosity` and `systemLog.component.<name>.verbosity` configuration fields are correctly structured for `mongod.conf`.
- `db.setLogLevel()` and `db.getLogComponents()` are current, non-deprecated mongosh methods.
- Verbosity levels 0–5 and the `-1` inherit behavior are accurately described.
- All listed log components (`query`, `replication`, `storage`, `network`, `index`, `command`) are valid MongoDB log components.
- The `getLog: "global"` admin command is correct for retrieving recent log entries.
- The best practices section correctly demonstrates resetting component verbosity to `-1` (inherit) to restore defaults.
- None.
