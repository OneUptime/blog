# Validation Summary: How to Configure the systemLog Section in mongod.conf

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (mongod server configuration)
- YAML configuration (mongod.conf)
- systemLog configuration options (destination, path, logAppend, timeStampFormat, verbosity, component verbosity, syslogFacility)
- Linux logrotate
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB official documentation: systemLog configuration file options (https://www.mongodb.com/docs/manual/reference/configuration-options/#systemlog-options)
- MongoDB official documentation: log messages and structured logging (https://www.mongodb.com/docs/manual/reference/log-messages/)
- MongoDB official documentation: logRotate admin command (https://www.mongodb.com/docs/manual/reference/command/logRotate/)
- MongoDB official documentation: getLog command (https://www.mongodb.com/docs/manual/reference/command/getLog/)
- MongoDB official documentation: getCmdLineOpts command (https://www.mongodb.com/docs/manual/reference/command/getCmdLineOpts/)

## Issues Found
- **Timestamp format example**: The `iso8601-utc` example timestamp was shown as `2026-03-31T10:00:00.000+0000` (without colon in offset). MongoDB's structured JSON logging (4.4+) uses the ISO 8601 extended format `+00:00` with a colon. Fixed to `2026-03-31T10:00:00.000+00:00`.

## Review Notes
- The `timeStampFormat` option still functions in MongoDB 4.4+ with structured JSON logging, but its effect is limited to the timestamp field within the JSON log entries. The post does not mention this nuance, but the information presented is not incorrect.
- The post correctly notes that `destination` accepts `file` and `syslog`. MongoDB also writes to stdout when no destination is specified, but this is not an explicit `destination` value, so the omission is acceptable.
- The `syslogFacility: daemon` example is a valid configuration choice; the default is `user`, but the post does not claim `daemon` is the default.
- The logrotate configuration example correctly uses `mongosh` (the modern MongoDB shell) rather than the deprecated `mongo` shell.
