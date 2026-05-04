# Validation Summary: How to Configure MongoDB Replica Sets with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongod / mongosh)
- MongoDB Replica Sets
- IPv6 networking
- PyMongo (Python driver)
- OpenSSH / scp
- OpenSSL (key file generation)
- YAML (mongod.conf)

## Sources Consulted
- MongoDB Manual — Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Manual — Replica Set Configuration: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB Manual — Replica Set Methods (rs.initiate, rs.add, rs.addArb, rs.remove, rs.reconfig, rs.status, rs.conf)
- MongoDB Manual — Connection String URI Format (host enclosed in `[ ]` for IPv6 literals)
- PyMongo Documentation — MongoClient and ReadPreference

## Issues Found
1. **Missing `net.ipv6: true` in mongod.conf.** MongoDB disables IPv6 support by default; setting `bindIp` to an IPv6 address is necessary but not sufficient. Without `net.ipv6: true`, mongod will refuse to listen on IPv6 addresses. Added the option to the YAML configuration block with a clarifying comment. Source: MongoDB Manual — `net.ipv6` setting.
2. **Incorrect comment on `priority = 0`.** The original comment read `// Set secondary as non-votable`, which is technically wrong. Setting `members[n].priority` to `0` makes a member non-electable (it cannot become primary) but it still votes in elections. Non-voting requires `members[n].votes = 0`. Updated the comment to: `// Make secondary non-electable (still votes)`. Source: MongoDB Manual — Replica Set Configuration.

## Review Notes
- The example IPv6 addresses use placeholder segments like `2001:db8::node1` which are not strictly valid hex. They are clearly intended as human-readable placeholders within the documentation `2001:db8::/32` reserved range and are consistent with the convention used throughout this blog series; left unchanged.
- The `scp` command using bracketed IPv6 syntax (`mongod@[2001:db8::node2]:/path`) works with modern OpenSSH but has historically been finicky. If readers run into trouble, `scp -6` or `scp -O` can help. Not modified.
- `openssl rand -base64 756` followed by `chmod 400` and `chown mongod:mongod` matches the official recommendation for a replica set internal-auth keyfile.
- The connection string format with bracketed IPv6 literals (`mongodb://[2001:db8::1]:27017/`) is correct per the MongoDB connection string URI spec.
- `ReadPreference.SECONDARY_PREFERRED` is a valid PyMongo read preference.
