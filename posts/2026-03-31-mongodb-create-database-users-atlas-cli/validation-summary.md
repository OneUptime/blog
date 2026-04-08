# Validation Summary: How to Create Database Users with the Atlas CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas
- MongoDB Atlas CLI (`atlas dbusers` commands)
- AWS IAM authentication for Atlas
- Bash scripting for CI automation

## Sources Consulted
- Official MongoDB Atlas CLI documentation for `atlas dbusers create`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-dbusers-create/
- Official MongoDB Atlas CLI documentation for `atlas dbusers list`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-dbusers-list/
- Official MongoDB Atlas CLI documentation for `atlas dbusers update`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-dbusers-update/
- Official MongoDB Atlas CLI documentation for `atlas dbusers delete`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-dbusers-delete/
- Atlas CLI source documentation on GitHub: https://github.com/mongodb/mongodb-atlas-cli

## Issues Found
1. **`--awsIamType` flag had incorrect casing**: The post used `--awsIamType` but the correct flag is `--awsIAMType` (capital I-A-M). Fixed the flag name in the AWS IAM authentication section.

2. **`--deleteAfterDate` flag does not exist**: The correct flag name is `--deleteAfter`, not `--deleteAfterDate`. Fixed all occurrences (in the "Setting Password Expiry" section and the Summary).

3. **`--file` flag does not exist on `atlas dbusers create`**: The post claimed you could use `atlas dbusers create --file user-spec.json` with a JSON spec file, but the `atlas dbusers create` command does not support a `--file` flag. Replaced the section with the correct approach: passing multiple `--role` and `--scope` flags to assign multiple roles and scopes to a single user.

## Review Notes
- All other commands, flags, role formats (`roleName@dbName`), scope formats (`clusterName:CLUSTER`), and `--awsIAMType ROLE` value are correct per official documentation.
- The `--force` flag on `atlas dbusers delete` is correct and skips the confirmation prompt.
- The `--output json` flag on `atlas dbusers list` is correct.
- The CI automation script pattern is sound and uses proper variable quoting.
