# Validation Summary: How to Set Log Verbosity for Specific Components in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (server logging subsystem)
- mongosh (MongoDB Shell)
- mongod.conf (YAML configuration)
- Structured JSON log format (MongoDB 4.4+)

## Sources Consulted
- MongoDB Manual: Log Messages — https://www.mongodb.com/docs/manual/reference/log-messages/
- MongoDB Manual: `logComponentVerbosity` parameter — https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.logComponentVerbosity
- MongoDB Manual: `setParameter` command — https://www.mongodb.com/docs/manual/reference/command/setParameter/
- MongoDB Manual: Configuration File Options (`systemLog`) — https://www.mongodb.com/docs/manual/reference/configuration-options/#systemlog-options

## Issues Found

1. **Verbosity level 0 description was inaccurate (Introduction and Verbosity Levels table):** The post described level 0 as "warnings and errors only." In MongoDB, verbosity level 0 is the "Informational" default which includes informational messages, warnings, and errors — not just warnings and errors. Fixed the introduction and the verbosity table to correctly state that level 0 includes info, warning, and error messages.

2. **Misleading method reference in "Setting Verbosity at Runtime" section:** The text said "Use `setLogLevel` to change verbosity" but all the code examples used `db.adminCommand({ setParameter: 1, ... })`. While `db.setLogLevel()` is a valid mongosh helper method, it was not what the code demonstrated. Changed the text to reference `db.adminCommand()` with `setParameter` to match the actual code shown.

## Review Notes
- The list of log components is labeled "Key" components and is intentionally not exhaustive. Additional components exist in modern MongoDB versions (e.g., `transaction`, `election`, `initialSync`, `recovery`, `ftdc`) that could be mentioned in a future update.
- The structured JSON log format shown is specific to MongoDB 4.4+. Earlier versions used a different plaintext format. The post does not specify version requirements, which could confuse users on older versions.
- The `db.setLogLevel(level, component)` shell helper is a simpler alternative to `db.adminCommand()` for setting individual component verbosity and could be mentioned as a convenience method in a future revision.
