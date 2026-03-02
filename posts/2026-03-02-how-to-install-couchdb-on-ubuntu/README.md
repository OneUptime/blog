# How to Install CouchDB on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CouchDB, Database, NoSQL, REST

Description: Learn how to install and configure Apache CouchDB on Ubuntu, set up a cluster, configure replication, and access it securely via the Fauxton web interface.

---

CouchDB is a document-oriented NoSQL database with a distinctive REST API - every operation uses standard HTTP verbs, and every document, database, and even the server itself is accessible as a URL. Its "eventual consistency" model and built-in replication protocol make it particularly well-suited for offline-first applications and multi-site deployments.

This guide covers installing CouchDB on Ubuntu, setting up authentication, configuring a single-node cluster, and exploring the Fauxton web interface.

## What Makes CouchDB Different

Before installing, it's worth understanding what sets CouchDB apart:

- **HTTP-native**: The API is pure REST with JSON. You can interact with it using `curl` alone.
- **Multi-Version Concurrency Control (MVCC)**: Writes never block reads. Each document has a revision ID.
- **Built-in replication**: Master-master replication built into the core, with conflict resolution support.
- **Fauxton UI**: A fully-featured web UI for database management built into CouchDB itself.
- **Map/Reduce views**: Query data through JavaScript functions rather than SQL.

## Prerequisites

- Ubuntu 22.04 or 24.04
- At least 1 GB RAM (2 GB recommended)
- Root or sudo access

## Installing CouchDB

Use the official Apache CouchDB repository:

```bash
# Install required packages
sudo apt update && sudo apt install -y curl apt-transport-https gnupg

# Add CouchDB repository key
curl -fsSL https://couchdb.apache.org/repo/keys.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/couchdb-archive-keyring.gpg

# Add the repository
echo "deb [signed-by=/usr/share/keyrings/couchdb-archive-keyring.gpg] \
  https://apache.jfrog.io/artifactory/couchdb-deb/ \
  $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/couchdb.list

# Install CouchDB
sudo apt update
sudo apt install -y couchdb
```

During installation, you'll be prompted for:
1. **Installation type**: Choose `standalone` for a single-node setup, or `clustered` if you're setting up a cluster now.
2. **Interface binding**: `0.0.0.0` to bind all interfaces, or `127.0.0.1` for localhost only.
3. **Admin password**: Set a strong admin password here.

## Verifying the Installation

```bash
# Check if CouchDB is running
sudo systemctl status couchdb

# Test the API (should return server info)
curl http://localhost:5984/

# Test with authentication
curl http://admin:your_password@localhost:5984/

# The welcome response looks like:
# {"couchdb":"Welcome","version":"3.x.x",...}
```

## Configuration File

CouchDB's configuration is in `/opt/couchdb/etc/local.ini` (for user overrides) and `default.ini` (default settings - don't edit this):

```bash
sudo nano /opt/couchdb/etc/local.ini
```

```ini
; /opt/couchdb/etc/local.ini
; Settings here override default.ini

[couchdb]
; Single node mode (standalone installation)
single_node = true

[chttpd]
; Interface to listen on
bind_address = 127.0.0.1
port = 5984

[httpd]
; Allow only admin access to _utils (Fauxton)
WWW-Authenticate = Basic realm="administrator"

[couch_httpd_auth]
; Require authentication for all requests
require_valid_user = true

; Session timeout in seconds (10 minutes)
timeout = 600

[log]
; Log level: debug, info, notice, warning, error, critical, alert, emergency
level = notice
file = /var/log/couchdb/couch.log

; Limit log file size
max_message_size = 16000

[compactions]
; Schedule compaction during off-peak hours
_default = [{db_fragmentation, "70%"}, {view_fragmentation, "60%"}, {from, "01:00"}, {to, "05:00"}]
```

After any configuration changes:

```bash
sudo systemctl restart couchdb
```

## Accessing Fauxton (Web UI)

CouchDB includes Fauxton, a browser-based database management interface:

```bash
# If CouchDB is bound to localhost, create an SSH tunnel to access it remotely:
# ssh -L 5984:localhost:5984 user@your-server

# Then open in your browser:
# http://localhost:5984/_utils/
```

You'll be prompted for the admin username and password you set during installation.

Through Fauxton you can:
- Create and delete databases
- Browse and edit documents
- Create and view Map/Reduce indexes (design documents)
- Monitor replication jobs
- View server statistics

## Working with the REST API

CouchDB's API is intuitive once you understand the patterns:

```bash
# Create a database
curl -X PUT http://admin:password@localhost:5984/myapp

# Create a document (CouchDB assigns the ID)
curl -X POST http://admin:password@localhost:5984/myapp \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com", "role": "admin"}'

# Create a document with a specific ID
curl -X PUT http://admin:password@localhost:5984/myapp/user_001 \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob", "email": "bob@example.com", "role": "user"}'

# Retrieve a document
curl http://admin:password@localhost:5984/myapp/user_001

# Update a document (MUST include the _rev field from the current document)
# First, get the current _rev:
REV=$(curl -s http://admin:password@localhost:5984/myapp/user_001 | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['_rev'])")

# Then update with the revision:
curl -X PUT http://admin:password@localhost:5984/myapp/user_001 \
  -H "Content-Type: application/json" \
  -d "{\"_rev\": \"$REV\", \"name\": \"Bob Smith\", \"email\": \"bob@example.com\", \"role\": \"moderator\"}"

# Delete a document
curl -X DELETE "http://admin:password@localhost:5984/myapp/user_001?rev=$REV"

# List all documents in a database
curl http://admin:password@localhost:5984/myapp/_all_docs

# Query with include_docs
curl "http://admin:password@localhost:5984/myapp/_all_docs?include_docs=true&limit=10"
```

## Creating Views (Map/Reduce Indexes)

CouchDB queries data through views defined as JavaScript functions stored in design documents:

```bash
# Create a design document with a view
curl -X PUT http://admin:password@localhost:5984/myapp/_design/users \
  -H "Content-Type: application/json" \
  -d '{
    "views": {
      "by_role": {
        "map": "function(doc) { if (doc.role) { emit(doc.role, doc.name); } }"
      },
      "by_email": {
        "map": "function(doc) { if (doc.email) { emit(doc.email, null); } }"
      }
    }
  }'

# Query the view
curl "http://admin:password@localhost:5984/myapp/_design/users/_view/by_role"

# Query for a specific role
curl "http://admin:password@localhost:5984/myapp/_design/users/_view/by_role?key=\"admin\""
```

## Setting Up Replication

CouchDB's replication can be one-shot or continuous:

```bash
# Replicate from a local database to a remote CouchDB
curl -X POST http://admin:password@localhost:5984/_replicate \
  -H "Content-Type: application/json" \
  -d '{
    "source": "myapp",
    "target": "https://admin:password@remote-couchdb.example.com/myapp",
    "continuous": true,
    "create_target": true
  }'

# Check replication status
curl http://admin:password@localhost:5984/_scheduler/jobs
```

## Creating Application Users

For applications, create non-admin users with access restricted to specific databases:

```bash
# Create a regular user in the _users database
curl -X PUT http://admin:password@localhost:5984/_users/org.couchdb.user:myapp_user \
  -H "Content-Type: application/json" \
  -d '{
    "name": "myapp_user",
    "password": "AppPassword123!",
    "roles": [],
    "type": "user"
  }'

# Set the database security to allow this user
curl -X PUT http://admin:password@localhost:5984/myapp/_security \
  -H "Content-Type: application/json" \
  -d '{
    "admins": {
      "names": [],
      "roles": []
    },
    "members": {
      "names": ["myapp_user"],
      "roles": []
    }
  }'
```

## Backup

```bash
# Simple backup using replication to a local database
curl -X POST http://admin:password@localhost:5984/_replicate \
  -H "Content-Type: application/json" \
  -d "{
    \"source\": \"myapp\",
    \"target\": \"myapp_backup_$(date +%Y%m%d)\",
    \"create_target\": true
  }"

# Or export all documents using _all_docs
curl "http://admin:password@localhost:5984/myapp/_all_docs?include_docs=true" \
  > /var/backups/couchdb/myapp_$(date +%Y%m%d).json
```

Monitor your CouchDB cluster's health and replication status with [OneUptime](https://oneuptime.com) to ensure your database stays available and replication jobs complete successfully.
