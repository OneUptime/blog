# Validation Summary: How to Install and Configure MongoDB on Ubuntu

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Ubuntu
- MongoDB Community Server 7.0
- MongoDB configuration file (`mongod.conf`)
- MongoDB authentication and users
- MongoDB replica sets
- MongoDB indexing and query explanation
- Linux systemd
- Transparent Huge Pages (THP)
- MongoDB Database Tools (`mongodump`, `mongorestore`)
- UFW firewall

## Sources Consulted
- MongoDB Docs: Install MongoDB Community Edition on Ubuntu v7.0: https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-ubuntu/
- MongoDB Docs: Install MongoDB Community Edition on Ubuntu v8.0: https://www.mongodb.com/docs/v8.0/tutorial/install-mongodb-on-ubuntu/
- MongoDB Docs: Localhost Exception in Self-Managed Deployments: https://www.mongodb.com/docs/v8.0/core/localhost-exception/
- MongoDB Docs: Enforce Keyfile Access Control in Existing Replica Set: https://www.mongodb.com/docs/manual/tutorial/enforce-keyfile-access-control-in-existing-replica-set/
- MongoDB Docs: Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Docs: Disable Transparent Hugepages for Self-Managed Deployments: https://www.mongodb.com/docs/manual/tutorial/disable-transparent-huge-pages/
- MongoDB Docs: mongodump: https://www.mongodb.com/docs/database-tools/mongodump/

## Issues Found
- The prerequisites listed Ubuntu 24.04 for a MongoDB 7.0 guide, but MongoDB 7.0 official Ubuntu packages support Ubuntu 22.04 and 20.04, not 24.04. Changed the prerequisite to Ubuntu 22.04 and pinned the repository example to `jammy/mongodb-org/7.0`.
- The installation section said the official repository gets the "current version" while the guide specifically installs MongoDB 7.0. Changed the wording to say it gets MongoDB 7.0.
- The authentication section said to create the admin user before enabling authentication even though the prior configuration already enabled authorization. Updated the wording to correctly describe MongoDB's localhost exception for creating the first user after enabling access control.
- The replica set example enabled authorization but did not configure internal member authentication. Added a shared keyfile step and `security.keyFile` in the replica set configuration because keyfile authentication is required for authenticated self-managed replica set members.
- The THP systemd unit only disabled `enabled`, omitted `defrag`, did not order itself before `mongod.service`, and did not reload systemd units before starting the service. Updated the unit and commands to match MongoDB's documented systemd guidance.
- The "Backup all databases" `mongodump` URI included `/admin`, which would select the `admin` database instead of dumping the whole instance. Changed it to use `?authSource=admin` with no database path. Applied the same auth-source fix to the restore and cron examples.

## Review Notes
MongoDB 8.0 supports Ubuntu 24.04, but this post is specifically written for MongoDB 7.0. A future refresh could either retitle/scope the article as MongoDB 7.0 on Ubuntu 22.04 or update the full guide to MongoDB 8.0 and adjust the THP guidance accordingly.
