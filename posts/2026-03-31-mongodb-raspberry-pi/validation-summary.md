# Validation Summary: How to Use MongoDB on Raspberry Pi

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0 (Community Edition)
- Raspberry Pi (Pi 4 / Pi 5, 64-bit ARM)
- Raspberry Pi OS (Bookworm, Debian 12-based)
- PyMongo (Python MongoDB driver)
- MongoDB Atlas (cloud sync)
- WiredTiger storage engine
- systemd service management

## Sources Consulted
- MongoDB 7.0 Installation on Debian: https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-debian/
- MongoDB Change Streams documentation: https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB WiredTiger Storage Engine configuration: https://www.mongodb.com/docs/manual/reference/configuration-options/#storage.wiredTiger.engineConfig.cacheSizeGB
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- PyMongo documentation: https://pymongo.readthedocs.io/en/stable/
- Python 3.12 deprecation of datetime.utcnow(): https://docs.python.org/3.12/library/datetime.html#datetime.datetime.utcnow
- MongoDB Replica Set configuration: https://www.mongodb.com/docs/manual/reference/configuration-options/#replication.replSetName

## Issues Found

### 1. Change streams used on standalone instance (Critical)
**What was wrong:** The "Syncing Pi Data to MongoDB Atlas" section used `collection.watch()` (change streams) on a standalone MongoDB instance. Change streams require a replica set because they rely on the oplog, which only exists on replica sets. Running the code as written would fail with: "The $changeStream stage is only supported on replica sets."

**What was changed:** Added instructions to convert the standalone instance to a single-node replica set by adding `replication.replSetName: rs0` to `/etc/mongod.conf`, restarting mongod, and running `rs.initiate()`. Also updated the `MongoClient` connection string to include `?replicaSet=rs0` for the local connection.

**Why:** Without this fix, the sync-to-Atlas feature described in the post would not work at all.

## Review Notes
- **`datetime.utcnow()` deprecation:** The Python code uses `datetime.datetime.utcnow()` and `datetime.utcnow()`, both deprecated since Python 3.12 in favor of `datetime.datetime.now(datetime.timezone.utc)`. Since Raspberry Pi OS Bookworm ships with Python 3.11, this is not yet an issue on the target platform, but will become one when future OS versions ship Python 3.12+.
- **MongoDB arm64 Debian package availability:** While the official MongoDB documentation lists arm64 as a supported architecture for Debian Bookworm, some community reports indicate that arm64 server packages may not always be available in the Debian repository (they are reliably available for Ubuntu). If installation fails, users may need to use Ubuntu Server for Raspberry Pi instead of Raspberry Pi OS.
- **GPG key URL redirect:** The GPG key URL `https://www.mongodb.org/static/pgp/server-7.0.asc` redirects to `https://pgp.mongodb.com/server-7.0.asc`. Both work, but the canonical URL has changed.
- **WiredTiger default cache size:** The post says setting `cacheSizeGB` prevents MongoDB from "claiming more than half the Pi's RAM." The actual default formula is `max(256 MB, (total RAM - 1 GB) / 2)`, so on a 4 GB Pi the default would be 1.5 GB (37.5% of RAM, not over 50%). The recommendation to set it explicitly to 0.5 GB is still sound advice for resource-constrained devices.
