# Validation Summary: How to Configure MongoDB Log Rotation

## Status
validated

## Post Type
Tutorial / Administration Guide

## Technologies Covered
- MongoDB (mongod, mongosh, logRotate command)
- Linux logrotate utility
- systemd / SIGUSR1 signal handling
- Bash scripting (disk monitoring)

## Sources Consulted
- MongoDB Manual: Configure Log Rotation — https://www.mongodb.com/docs/manual/reference/configuration-options/#systemlog-options
- MongoDB Manual: logRotate command — https://www.mongodb.com/docs/manual/reference/command/logRotate/
- MongoDB Manual: systemLog.logRotate configuration — https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-systemLog.logRotate
- Linux logrotate(8) man page — https://man7.org/linux/man-pages/man8/logrotate.8.html

## Issues Found

1. **Incorrect `logRotate` admin command parameter value**: The post used `db.adminCommand({ logRotate: "mongod" })` and described it as "for mongos in a sharded cluster, specify the process." The valid string values (introduced in MongoDB 6.1) are `"server"` and `"audit"`, which specify which log component to rotate, not which process type. Fixed to show `logRotate: "server"` and `logRotate: "audit"` with correct descriptions.

2. **"Using reopen with logrotate" section conflated two approaches**: The section showed `logRotate: reopen` in mongod.conf paired with `copytruncate` in logrotate. However, `copytruncate` works independently of MongoDB's `logRotate` setting and does not require `reopen` mode. The `reopen` mode is correctly paired with logrotate's default rename behavior + postrotate SIGUSR1 (as shown in the earlier section). Fixed by renaming the section to "Using copytruncate with logrotate" and clarifying that `copytruncate` is a standalone alternative that doesn't require a specific MongoDB `logRotate` setting or postrotate signal.

3. **False claim about MongoDB 4.4+ size-based rotation**: The post stated "MongoDB 4.4+ supports setting a maximum log file size before automatic rotation." MongoDB does not have built-in size-based log rotation. The `size` directive shown is a logrotate feature, not a MongoDB feature. Fixed the description to correctly attribute size-based rotation to logrotate.

4. **Missing note about `reopen` mode for logrotate config**: The first logrotate configuration section (with postrotate SIGUSR1) did not mention that MongoDB should be configured with `logRotate: reopen` for this approach. Added a note explaining the required mongod.conf setting.

## Review Notes
- The `du -s` command in the disk monitoring script assumes 1K-block output (GNU coreutils default on Linux). On systems where `du` defaults to 512-byte blocks (POSIX default), the GB calculation would be off by a factor of 2. Using `du -sk` would be more portable, but this is a minor concern for a Linux-focused post.
- The `sharedscripts` option is included in the first logrotate config but not explained in the options table. This is a minor omission — `sharedscripts` ensures the postrotate script runs once for all matched log files rather than once per file.
- The `getCmdLineOpts` admin command, SIGUSR1 signaling, logrotate directives, and bash commands are all technically correct.
- All configuration field names and values for mongod.conf (`systemLog.destination`, `systemLog.path`, `systemLog.logAppend`, `systemLog.logRotate`) are accurate.
