# How to Use MongoDB on Raspberry Pi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Raspberry Pi, IoT, Edge Computing, Linux

Description: Learn how to install and configure MongoDB on a Raspberry Pi for IoT data collection, edge storage, and local analytics on ARM hardware.

---

## Overview

Running MongoDB on a Raspberry Pi turns it into a capable edge data store for IoT sensor data, home automation, and local analytics. MongoDB supports 64-bit ARM (aarch64), making it compatible with Raspberry Pi 4 and Pi 5 running a 64-bit OS.

## Requirements

- Raspberry Pi 4 or Pi 5 (4 GB RAM minimum recommended)
- 64-bit Raspberry Pi OS (Bookworm or later)
- microSD card or USB SSD (SSD strongly recommended for production use)

## Installing MongoDB on Raspberry Pi OS (64-bit)

```bash
# Import the MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Add the MongoDB repository for Debian (Bookworm)
echo "deb [ arch=arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
  https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable the service
sudo systemctl start mongod
sudo systemctl enable mongod
```

## Verifying the Installation

```bash
mongosh --eval "db.runCommand({ connectionStatus: 1 })"
```

```text
{ authInfo: { authenticatedUsers: [], authenticatedUserRoles: [] }, ok: 1 }
```

## Configuring MongoDB for Raspberry Pi

Edit `/etc/mongod.conf` to limit memory usage on the Pi:

```yaml
storage:
  dbPath: /var/lib/mongodb
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.5

net:
  port: 27017
  bindIp: 127.0.0.1

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
```

Setting `cacheSizeGB: 0.5` limits WiredTiger's cache to 512 MB, preventing MongoDB from consuming all available RAM on a 4 GB Pi.

## Storing IoT Sensor Data

Install PyMongo on the Pi:

```bash
pip3 install pymongo
```

Write a Python script to collect and store sensor readings:

```python
from pymongo import MongoClient
import datetime
import time
import random  # Replace with actual sensor library

client = MongoClient("mongodb://localhost:27017")
db = client["iot"]
readings = db["sensor_readings"]

# Create TTL index to keep only 7 days of data
readings.create_index("timestamp", expireAfterSeconds=604800)

while True:
    reading = {
        "deviceId": "pi-sensor-01",
        "temperature": round(random.uniform(18.0, 28.0), 2),
        "humidity": round(random.uniform(40.0, 80.0), 2),
        "timestamp": datetime.datetime.utcnow()
    }
    readings.insert_one(reading)
    print(f"Recorded: {reading}")
    time.sleep(60)  # Collect every minute
```

## Querying Stored Sensor Data

```python
from datetime import datetime, timedelta

one_hour_ago = datetime.utcnow() - timedelta(hours=1)
recent = readings.find(
    {"timestamp": {"$gte": one_hour_ago}},
    {"_id": 0, "temperature": 1, "humidity": 1, "timestamp": 1}
).sort("timestamp", -1)

for r in recent:
    print(r)
```

## Syncing Pi Data to MongoDB Atlas

Change streams require a replica set (they rely on the oplog, which only exists on replica sets). Convert your standalone instance to a single-node replica set first:

1. Add the following to `/etc/mongod.conf`:

```yaml
replication:
  replSetName: rs0
```

2. Restart MongoDB and initiate the replica set:

```bash
sudo systemctl restart mongod
mongosh --eval "rs.initiate()"
```

Then use a change stream to forward new readings from the Pi to Atlas:

```python
from pymongo import MongoClient

local_client = MongoClient("mongodb://localhost:27017/?replicaSet=rs0")
atlas_client = MongoClient(ATLAS_URI)

local_col = local_client["iot"]["sensor_readings"]
atlas_col = atlas_client["iot"]["sensor_readings"]

with local_col.watch([{"$match": {"operationType": "insert"}}]) as stream:
    for change in stream:
        atlas_col.insert_one(change["fullDocument"])
```

## Best Practices

- Use an SSD over USB 3.0 instead of a microSD card for MongoDB data storage - SD cards have poor random write performance and wear out quickly.
- Set `cacheSizeGB` explicitly to prevent MongoDB from claiming more than half the Pi's RAM.
- Use TTL indexes on all sensor collections to automatically expire old data and prevent storage exhaustion.
- Run `mongod` as a systemd service with `Restart=always` so it recovers automatically after Pi reboots.

## Summary

MongoDB runs well on a 64-bit Raspberry Pi with proper WiredTiger cache sizing and SSD storage. It makes an effective local IoT data store for sensor readings, home automation events, and edge analytics, with optional sync to Atlas for centralized access.
