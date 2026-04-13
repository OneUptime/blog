# Validation Summary: How to Rotate MongoDB Log Files

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongod server logging configuration)
- mongosh (MongoDB Shell)
- Linux signals (SIGUSR1)
- logrotate (Linux log rotation utility)
- cron (Linux task scheduler)

## Sources Consulted
- MongoDB documentation on log rotation: https://www.mongodb.com/docs/manual/tutorial/rotate-log-files/
- MongoDB documentation on systemLog configuration options: https://www.mongodb.com/docs/manual/reference/configuration-options/#systemlog-options
- MongoDB documentation on db.adminCommand() logRotate: https://www.mongodb.com/docs/manual/reference/command/logRotate/
- Linux logrotate man page (logrotate(8))

## Issues Found
No technical issues found.

## Review Notes
- The `db.adminCommand({ logRotate: 1 })` syntax is the traditional form. MongoDB 7.1+ also supports string values like `"server"` and `"audit"` to target specific log components, but the `1` value remains valid and rotates all server logs.
- The logrotate configuration in Method 3 uses SIGUSR1 in the postrotate script. While this works with both `rename` and `reopen` modes, the post correctly recommends using `logRotate: reopen` when integrating with the system logrotate utility, as this is the intended pairing per MongoDB documentation.
- All commands and configuration snippets are syntactically correct and reflect current MongoDB practices.
