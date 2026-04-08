# Validation Summary: How to Configure Log Destinations (File, Syslog) in MongoDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (mongod.conf, systemLog configuration)
- Linux syslog (rsyslog)
- logrotate
- Docker / Kubernetes container logging
- mongosh

## Sources Consulted
- MongoDB official documentation: `systemLog` configuration options (https://www.mongodb.com/docs/manual/reference/configuration-options/#systemlog-options)
- MongoDB official documentation: `logRotate` command (https://www.mongodb.com/docs/manual/reference/command/logRotate/)
- MongoDB official documentation: `systemLog.syslogFacility` (https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-systemLog.syslogFacility)
- MongoDB official documentation: `systemLog.logRotate` (https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-systemLog.logRotate)
- Linux logrotate man page

## Issues Found
1. **Incorrect stdout logging command**: The post showed `mongod --logpath "" --logappend` to log to stdout. Passing an empty string to `--logpath` causes an error; MongoDB expects a valid file path. Additionally, `--logappend` is meaningless without a valid `--logpath`. Fixed by replacing with a standard `mongod` invocation without `--logpath`, which correctly sends logs to stdout.

2. **Incorrect version for logRotate string argument**: The post stated the string argument to `logRotate` (e.g., `"server"`) was available in "MongoDB 5.0+". This feature was actually introduced in MongoDB 5.1. Fixed the version reference to "MongoDB 5.1+".

## Review Notes
- The list of valid syslog facilities ("user, local0 through local7, and daemon") is incomplete but not incorrect since the post uses "include" rather than claiming it's exhaustive. Other valid facilities like `auth`, `authpriv`, `cron`, `kern`, etc. are omitted but this is acceptable for brevity.
- The Python log parsing snippet in the verification section uses a bare `except` clause, which is not best practice but is acceptable for a quick diagnostic one-liner.
