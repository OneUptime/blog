# How to Use Percona Server for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Percona, Database, Performance, Backup

Description: Learn how to install, configure, and use Percona Server for MongoDB to access enterprise-grade features under an open-source license.

---

## What Is Percona Server for MongoDB?

Percona Server for MongoDB (PSMDB) is a fully compatible, open-source drop-in replacement for MongoDB Community Edition. It adds enterprise-grade features at no cost, including:

- Hot backup without stopping the server
- In-memory storage engine
- Audit logging
- KMIP encryption at rest

## Installation on Ubuntu

```bash
# Add Percona repository
wget https://repo.percona.com/apt/percona-release_latest.generic_all.deb
sudo dpkg -i percona-release_latest.generic_all.deb
sudo percona-release setup psmdb-70

# Install
sudo apt-get update
sudo apt-get install -y percona-server-mongodb
```

## Installation on RHEL / CentOS

```bash
sudo percona-release setup psmdb-70
sudo yum install -y percona-server-mongodb
```

Start and enable the service:

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

## Configure Hot Backups

Percona's hot backup feature lets you take a consistent backup without locks:

```javascript
// Initiate a hot backup
db.runCommand({ createBackup: 1, backupDir: "/var/backups/mongodb/backup1" });
```

This creates a consistent copy of the data files that can be restored by simply placing them in the `dbPath` directory.

## Enable Audit Logging

Add audit configuration to `/etc/mongod.conf`:

```yaml
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.json
  filter: >
    {
      atype: {
        $in: ["authenticate", "createCollection", "dropCollection", "createIndex"]
      }
    }
```

Restart MongoDB and verify audit events appear:

```bash
sudo systemctl restart mongod
tail -f /var/log/mongodb/audit.json | python3 -m json.tool
```

## Enable Encryption at Rest

PSMDB supports KMIP-based encryption. Configure the KMIP server connection in `/etc/mongod.conf`:

```yaml
security:
  enableEncryption: true
  kmip:
    serverName: kmip-server.example.com
    port: 5696
    clientCertificateFile: /etc/mongodb/kmip-client.pem
    serverCAFile: /etc/mongodb/kmip-ca.pem
    keyIdentifier: myKey
```

## Use the In-Memory Storage Engine

For caching workloads, switch to the in-memory engine which stores all data in RAM:

```yaml
storage:
  engine: inMemory
  inMemory:
    engineConfig:
      inMemorySizeGB: 4
```

This is useful for session stores or leaderboards where data persistence is not required.

## Monitor with Percona Monitoring and Management

Percona offers PMM (Percona Monitoring and Management) as a free observability stack:

```bash
docker run -d \
  --name pmm-server \
  -p 80:80 \
  -p 443:443 \
  percona/pmm-server:latest

# Register the MongoDB instance
pmm-admin add mongodb \
  --username=pmm \
  --password=pmmpass \
  --host=localhost \
  --port=27017
```

PMM provides dashboards for query analytics, replication lag, and WiredTiger cache metrics out of the box.

## Summary

Percona Server for MongoDB is a binary-compatible replacement for MongoDB Community that adds hot backups, audit logging, encryption at rest, and additional storage engines under the SSPL license. Installation follows the same process as MongoDB using the Percona repository. Hot backups, audit filtering, and the in-memory engine can be enabled through `mongod.conf` configuration without any application changes.
