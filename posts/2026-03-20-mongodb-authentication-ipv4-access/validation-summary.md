# Validation Summary: How to Set Up MongoDB Authentication with IPv4 Access Control

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongod, mongosh)
- YAML configuration (`/etc/mongod.conf`)
- systemd (`systemctl`)
- UFW (Uncomplicated Firewall)
- iptables
- MongoDB Role-Based Access Control (RBAC)

## Sources Consulted
- MongoDB Manual — Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Manual — `net.bindIp`: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-net.bindIp
- MongoDB Manual — `security.authorization`: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-security.authorization
- MongoDB Manual — `db.createUser()`: https://www.mongodb.com/docs/manual/reference/method/db.createUser/
- MongoDB Manual — Built-In Roles: https://www.mongodb.com/docs/manual/reference/built-in-roles/
- MongoDB Manual — Connection String URI Format: https://www.mongodb.com/docs/manual/reference/connection-string/
- mongosh CLI reference: https://www.mongodb.com/docs/mongodb-shell/reference/options/
- UFW man page (Ubuntu)
- iptables man page

## Issues Found
No technical issues found.

## Review Notes
- The `reporter` user is created in the `reporting` database with a `read` role on `myapp`. This is technically valid in MongoDB (a user's authentication database can differ from the database their role grants permissions on), but it is slightly unconventional. To authenticate, the user would need `--authenticationDatabase reporting`. Not an error, just an unusual pattern.
- The example passwords contain `!`, which is shell-history-expansion sensitive in interactive bash. The double-quoted URI form (`"mongodb://...!..."`) avoids this; the `-p AppPassword456!` form on a non-interactive command line works as written. RFC 3986 does not require `!` to be percent-encoded in connection URIs.
- The `bindIp: 127.0.0.1,10.0.0.10` value is a comma-separated list per MongoDB's documented format; whitespace is also tolerated but optional.
- The UFW ruleset relies on rule order: the `allow from <ip>` rules are inserted before the `deny 27017` catch-all, so the allow matches take precedence. This is correct UFW behavior.
- No version-specific caveats: the syntax shown applies to MongoDB 4.x, 5.x, 6.x, 7.x, and 8.x. `mongosh` (vs. the legacy `mongo` shell) is the current shell as of MongoDB 5.0+, and the post correctly uses it throughout.
