# Validation Summary: How to Configure Structured Logging in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (4.4+ structured logging)
- mongod.conf configuration
- jq (command-line JSON processor)
- Filebeat (Elastic log shipper)
- Elasticsearch

## Sources Consulted
- MongoDB Structured Logging documentation: https://www.mongodb.com/docs/manual/reference/log-messages/
- MongoDB Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/#systemlog-options
- MongoDB db.setLogLevel() reference: https://www.mongodb.com/docs/manual/reference/method/db.setLogLevel/
- Filebeat JSON input documentation: https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-input-log.html

## Issues Found

1. **Non-existent `logFormat: json` config option**: The post included a YAML snippet suggesting `systemLog.logFormat: json` as a config option for older MongoDB versions. This option does not exist in MongoDB's configuration. Structured JSON logging was introduced in MongoDB 4.4 as the only log format with no toggle. Versions before 4.4 use plaintext logs and do not support structured JSON at all. Replaced the incorrect snippet with an accurate explanation.

2. **Mismatched jq comment**: The comment for the first jq example said "duration > 0" but the actual filter used `> 100`. Updated the comment to say "duration > 100ms" to match the code.

## Review Notes
- The severity levels listed (D, I, W, E, F) are correct but simplified. MongoDB actually supports debug levels D1 through D5 for finer-grained debug output. This simplification is acceptable for the scope of the post.
- The log entry example uses message ID `51803` and message `"Slow query"` — these are illustrative and not exact matches to real MongoDB log IDs, which is fine for a tutorial context.
- The Filebeat config uses the older `type: log` input. Newer Filebeat versions recommend `type: filestream`, but `type: log` remains functional and is not deprecated in current releases.
