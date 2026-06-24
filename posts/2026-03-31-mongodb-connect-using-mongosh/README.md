# How to Connect to MongoDB Using mongosh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongosh, Connection, Authentication

Description: Learn all the ways to connect to MongoDB using mongosh - standalone, replica sets, Atlas, and sharded clusters with various authentication methods and options.

---

## Basic Connection

The simplest connection with no authentication connects to `localhost:27017`:

```bash
mongosh
```

Connect to a specific host and port:

```bash
mongosh --host 192.168.1.100 --port 27017
```

## Connecting with a URI

The URI format is the most versatile approach:

```bash
# Standalone
mongosh "mongodb://localhost:27017/mydb"

# With authentication
mongosh "mongodb://admin:secretpass@localhost:27017/admin"

# Replica set
mongosh "mongodb://host1:27017,host2:27017,host3:27017/?replicaSet=rs0"

# With TLS
mongosh "mongodb://localhost:27017/?tls=true&tlsCAFile=/etc/ssl/ca.pem"
```

## Connecting to MongoDB Atlas

Use the connection string from the Atlas UI:

```bash
mongosh "mongodb+srv://username:password@cluster0.abc123.mongodb.net/mydb"
```

Or with individual flags:

```bash
mongosh \
  --host "cluster0-shard-00-00.abc123.mongodb.net:27017" \
  --tls \
  --authenticationMechanism SCRAM-SHA-256 \
  --username admin \
  --password
```

The `--password` flag without a value prompts for the password without echoing it.

## Connecting with Authentication

```bash
# Username and password via URI
mongosh "mongodb://dbUser:pass123@localhost:27017/mydb?authSource=admin"

# Prompt for password (more secure)
mongosh --username admin --authenticationDatabase admin --password
```

## Switching Databases Inside mongosh

Once connected, switch databases:

```javascript
use mydb
show dbs
show collections
```

## Connecting to a Specific Database on Startup

Include the database name in the URI or use `--eval`:

```bash
mongosh "mongodb://localhost:27017/sales"
mongosh --eval "use('sales')" "mongodb://localhost:27017"
```

## Running a Single Command and Exiting

```bash
mongosh "mongodb://localhost:27017" --eval "db.runCommand({ping:1})" --quiet
```

Output:

```text
{ ok: 1 }
```

## Connecting with x.509 Certificate Authentication

```bash
mongosh "mongodb://localhost:27017/?authMechanism=MONGODB-X509" \
  --tls \
  --tlsCertificateKeyFile /etc/ssl/client.pem \
  --tlsCAFile /etc/ssl/ca.pem
```

## Connection Status

After connecting, check the connection details:

```javascript
db.getMongo().getURI()       // current URI
db.adminCommand("ismaster")  // primary/secondary status
db.runCommand({ connectionStatus: 1 }) // auth info
```

## Quiet and Non-Interactive Mode

For scripting and CI pipelines:

```bash
mongosh --quiet --norc "mongodb://localhost:27017" \
  --file /scripts/setup.js
```

`--norc` skips loading `.mongoshrc.js`, and `--quiet` suppresses banner output.

## Summary

Connect to MongoDB with `mongosh` using URI strings for maximum flexibility - embed credentials, replica set names, and TLS options directly. Use `--password` without a value to avoid credential exposure in shell history. For scripting, add `--quiet --norc` flags and pass scripts via `--file`.
