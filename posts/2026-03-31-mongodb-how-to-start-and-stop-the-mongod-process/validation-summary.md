# Validation Summary: How to Start and Stop the mongod Process

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (mongod process)
- systemd (Linux service management)
- mongosh (MongoDB Shell)
- Linux CLI tools (pgrep, kill, ss)

## Sources Consulted
- MongoDB official documentation: Install MongoDB Community Edition on Linux (systemd usage) — https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/
- MongoDB official documentation: db.adminCommand() — https://www.mongodb.com/docs/manual/reference/method/db.adminCommand/
- MongoDB official documentation: mongod command-line options — https://www.mongodb.com/docs/manual/reference/program/mongod/
- MongoDB official documentation: rs.stepDown() — https://www.mongodb.com/docs/manual/reference/method/rs.stepDown/
- MongoDB official documentation: Terminate Running Operations (shutdown) — https://www.mongodb.com/docs/manual/tutorial/manage-mongodb-processes/
- systemd documentation for ExecReload — https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
1. **Removed `systemctl reload mongod` command.** The MongoDB systemd unit file does not define an `ExecReload` directive, so `systemctl reload mongod` will fail with an error. MongoDB does not support reloading its configuration without a full restart. Removed the command and its comment to avoid misleading readers.

2. **Separated mixed shell/JavaScript code block.** The "Graceful Shutdown via mongosh" section had a bash command (`mongosh --username admin --authenticationDatabase admin`) inside a code block tagged as `javascript`. Split it into a separate `bash` code block for the connection command and a `javascript` code block for the shutdown command, so syntax highlighting and reader expectations are correct.

## Review Notes
- The `db.adminCommand({ shutdown: 1 })` on a replica set primary automatically triggers a stepdown in MongoDB 4.2+. The explicit `rs.stepDown()` before shutdown is still good practice for more controlled failover, so the advice is sound.
- The inline comment `# Run in background` after `--fork` in the manual startup example is valid bash (comment on the last line of a continued command) but could confuse readers unfamiliar with bash comment syntax in multi-line commands. Not changed since it is technically correct.
