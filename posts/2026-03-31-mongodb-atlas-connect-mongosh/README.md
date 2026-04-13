# How to Connect to MongoDB Atlas from mongosh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Mongosh, Connection, Cloud

Description: Learn how to connect mongosh to MongoDB Atlas clusters using connection strings, including setup steps, authentication, and common connection issues.

---

MongoDB Atlas is the fully managed cloud database service, and mongosh is the recommended way to interact with Atlas clusters from the command line. This guide covers the connection process from setup to running your first query.

## Prerequisites

Install mongosh if you have not already:

```bash
# macOS
brew install mongosh

# Ubuntu/Debian
sudo apt-get install -y mongodb-mongosh

# Verify
mongosh --version
```

## Finding Your Atlas Connection String

1. Log in to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Navigate to your cluster and click **Connect**
3. Choose **Shell** from the connection method options
4. Copy the connection string (it looks like the example below)

## Connecting with Username and Password

```bash
mongosh "mongodb+srv://cluster0.abc12.mongodb.net/mydb" \
  --username myuser
```

mongosh will prompt for the password. To avoid the prompt in scripts:

```bash
mongosh "mongodb+srv://myuser:mypassword@cluster0.abc12.mongodb.net/mydb"
```

## Connecting to a Specific Database

Append the database name to the connection string:

```bash
mongosh "mongodb+srv://myuser:mypassword@cluster0.abc12.mongodb.net/production"
```

Verify the active database after connecting:

```javascript
db.getName()
// production
```

## Using an Environment Variable for the URI

Avoid storing credentials in shell history:

```bash
export MONGODB_URI="mongodb+srv://myuser:mypassword@cluster0.abc12.mongodb.net"
mongosh "$MONGODB_URI/mydb"
```

## Running a Quick Query After Connecting

Once connected, run standard MongoDB operations:

```javascript
// Show all collections
show collections

// Count documents in a collection
db.orders.countDocuments()

// Find recent records
db.orders.find({ status: "pending" }).sort({ createdAt: -1 }).limit(5)
```

## Connecting via Private Endpoint

If your Atlas cluster uses private endpoints (AWS PrivateLink, Azure Private Link, or GCP Private Service Connect), Atlas provides a separate private connection string. Copy the private endpoint connection string from the Atlas UI and connect:

```bash
mongosh "mongodb+srv://myuser:mypassword@cluster0-pl-0.abc12.mongodb.net/mydb"
```

TLS is enabled by default for all Atlas `mongodb+srv://` connections, so the `--tls` flag is not required.

## Troubleshooting Connection Issues

Common errors and fixes:

```text
Error: Authentication failed
- Check username and password are correct
- Verify the user exists in Atlas Database Access

Error: IP address not whitelisted
- Add your current IP in Atlas Network Access

Error: MongoServerSelectionError
- Check that your cluster is running (not paused in Atlas)
- Verify the cluster hostname in the connection string
```

## Monitoring Atlas Connectivity with OneUptime

Use OneUptime to monitor Atlas cluster availability from outside your network. Set up a TCP or HTTP monitor targeting your Atlas endpoint to catch outages before they impact users.

## Summary

Connecting mongosh to MongoDB Atlas requires a valid connection string from the Atlas dashboard, correct credentials, and IP access list configuration. Using environment variables for credentials keeps connection strings out of shell history and scripts.

