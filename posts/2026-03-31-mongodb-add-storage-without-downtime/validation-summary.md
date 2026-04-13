# Validation Summary: How to Add Storage to a MongoDB Cluster Without Downtime

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- MongoDB (replica sets, sharded clusters, dbStats, sh.addShard, sh.status)
- Linux filesystem tools (df, du, rsync, mkfs.ext4, resize2fs, growpart)
- AWS CLI (ec2 modify-volume for EBS resize)
- systemd (systemctl for mongod service management)
- mongod.conf (YAML configuration for storage.dbPath)

## Sources Consulted
- MongoDB Manual: dbStats command — https://www.mongodb.com/docs/manual/reference/command/dbStats/
- MongoDB Manual: Config Database collections — https://www.mongodb.com/docs/manual/reference/config-database/
- MongoDB Manual: sh.addShard() — https://www.mongodb.com/docs/manual/reference/method/sh.addShard/
- MongoDB Manual: sh.status() — https://www.mongodb.com/docs/manual/reference/method/sh.status/
- MongoDB Manual: config.changelog collection — https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.changelog
- AWS CLI reference: ec2 modify-volume — https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-volume.html
- Linux man pages: growpart, resize2fs, rsync

## Issues Found
- **Incorrect config collection reference for monitoring chunk migrations**: The post used `db.getSiblingDB("config").migrations.countDocuments({ state: { $ne: "done" } })` to monitor balancing progress. The `config.migrations` collection is not a documented MongoDB config database collection, and the `state` field with a `"done"` value is not part of any documented schema. Replaced with `db.getSiblingDB("config").changelog.find({ what: "moveChunk.commit" }).sort({ time: -1 }).limit(10)`, which queries the documented `config.changelog` collection for recent chunk migration events.

## Review Notes
- The `dbStats` command correctly uses `scale: 1024 * 1024` and accurately claims to report `dataSize`, `storageSize`, and `fsUsedSize` (available since MongoDB 3.6).
- The AWS EBS resize workflow (modify-volume, growpart, resize2fs) is correct and can be performed without downtime on ext4 filesystems.
- The `resize2fs` command shown is specific to ext4. If using XFS (common on Amazon Linux 2), `xfs_growfs` would be needed instead. The post doesn't mention this but it's a minor omission given the ext4 context in Option 2.
- The rsync command correctly uses a trailing slash on the source path to copy contents rather than the directory itself.
- The `sh.addShard()` syntax is correct for adding a replica set as a new shard.
