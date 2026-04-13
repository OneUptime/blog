# How to Use MongoDB Keyfile Authentication for Replica Sets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Keyfile, Authentication, Replica Set, Security

Description: Learn how to create and configure a keyfile for MongoDB replica set internal authentication, enabling secure member-to-member communication without certificates.

---

## Introduction

Keyfile authentication is the simplest way to enable internal authentication between members of a MongoDB replica set or sharded cluster. All members share the same keyfile containing a secret string. When a member connects to another, it presents this secret as proof of identity. This prevents unauthorized mongod instances from joining your replica set.

## Keyfile vs x.509

| Feature | Keyfile | x.509 Certificate |
|---|---|---|
| Setup complexity | Simple | Complex (requires PKI) |
| Security level | Good (shared secret) | Excellent (asymmetric) |
| Certificate rotation | Not applicable | Required periodically |
| Recommended for | Small teams, simple setups | Production at scale |

## Step 1: Generate the Keyfile

A keyfile must contain 6 to 1,024 characters of base64 content. Use `openssl` to generate a random key:

```bash
# Generate a 756-byte random keyfile
openssl rand -base64 756 > /etc/mongodb/keyfile

# Set strict permissions - only the mongod user may read it
chmod 400 /etc/mongodb/keyfile
chown mongod:mongod /etc/mongodb/keyfile
```

View the keyfile content (do not share this):

```bash
cat /etc/mongodb/keyfile
```

## Step 2: Copy the Keyfile to All Replica Set Members

The keyfile must be identical on every member. Use `scp` or a configuration management tool:

```bash
# Copy to secondary nodes
scp /etc/mongodb/keyfile user@secondary1.example.com:/etc/mongodb/keyfile
scp /etc/mongodb/keyfile user@secondary2.example.com:/etc/mongodb/keyfile

# Set permissions on each secondary
ssh user@secondary1.example.com "chmod 400 /etc/mongodb/keyfile && chown mongod:mongod /etc/mongodb/keyfile"
ssh user@secondary2.example.com "chmod 400 /etc/mongodb/keyfile && chown mongod:mongod /etc/mongodb/keyfile"
```

## Step 3: Configure mongod.conf on All Members

```yaml
# /etc/mongod.conf (same on all replica set members)
net:
  port: 27017
  bindIp: 0.0.0.0

replication:
  replSetName: "rs0"

security:
  keyFile: /etc/mongodb/keyfile
  authorization: enabled

storage:
  dbPath: /var/lib/mongodb
```

Enabling `keyFile` automatically enables `authorization`.

## Step 4: Restart mongod on All Members

```bash
# On each member (one at a time to avoid losing quorum)
sudo systemctl restart mongod
```

## Step 5: Create an Admin User (Before Enabling Auth)

If this is a fresh setup, create the admin user before enabling the keyfile:

```bash
# Connect without auth on the primary
mongosh --port 27017
```

```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "secureAdminPassword",
  roles: [
    { role: "root", db: "admin" }
  ]
})
```

Then restart with the keyfile configuration.

## Step 6: Verify Internal Authentication Is Working

After restarting with keyfiles, check the replica set status:

```bash
mongosh --username admin --password --authenticationDatabase admin
```

```javascript
rs.status()
// All members should be PRIMARY or SECONDARY
// No UNKNOWN or authentication errors in lastHeartbeatMessage
```

## Step 7: Rotating the Keyfile

MongoDB supports keyfile rotation in MongoDB 3.6+ using a transition period where both old and new keys are accepted:

```yaml
# Step A: Add the new key to all members (both old and new key in the file)
security:
  keyFile: /etc/mongodb/keyfile
  # keyfile contains BOTH old and new key (one per line)
```

```bash
# Keyfile with two keys during transition
cat > /etc/mongodb/keyfile << EOF
$(cat old-key.txt)
$(cat new-key.txt)
EOF
chmod 400 /etc/mongodb/keyfile
```

Restart mongod on all members. Once all members accept both keys, remove the old key from the keyfile:

```bash
# Step B: Keep only the new key
cp new-key.txt /etc/mongodb/keyfile
chmod 400 /etc/mongodb/keyfile
```

Restart all members again.

## Keyfile in Docker

```yaml
# docker-compose.yml
version: "3.8"
services:
  mongo1:
    image: mongo:7.0
    command: mongod --replSet rs0 --keyFile /etc/mongodb/keyfile
    volumes:
      - ./keyfile:/etc/mongodb/keyfile:ro
      - mongo1-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: adminPassword

volumes:
  mongo1-data:
```

```bash
# Set permissions before starting
chmod 400 ./keyfile
```

## Troubleshooting Keyfile Issues

```bash
# Permission denied error
# Error: "Unable to open keyfile '/etc/mongodb/keyfile'"
ls -la /etc/mongodb/keyfile
# Permissions should be: -r-------- 1 mongod mongod

# Authentication failed on rs member
# Check if all members have the SAME keyfile
md5sum /etc/mongodb/keyfile  # Must match on all nodes

# View auth errors in the log
grep -i "keyfile\|auth\|unauthorized" /var/log/mongodb/mongod.log | tail -20
```

## Summary

Keyfile authentication for MongoDB replica sets involves generating a shared secret with `openssl rand -base64 756`, distributing it to all members with `chmod 400` permissions, and setting `security.keyFile` in `mongod.conf`. All members present this key during replica set heartbeats to prove membership. For keyfile rotation, use a dual-key transition period to avoid authentication failures during the changeover. For production deployments requiring stronger security, consider upgrading to x.509 certificate authentication.
