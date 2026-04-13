# How to Set Up MongoDB Atlas Free Tier for Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Free Tier, Getting Started, Development

Description: Step-by-step guide to creating and configuring a free MongoDB Atlas cluster for local development, including connection setup and driver integration.

---

## What Is MongoDB Atlas Free Tier?

MongoDB Atlas M0 is the free shared cluster tier - perfect for learning, prototyping, and development. It provides:
- 512 MB of storage
- Shared RAM and CPU
- Access to most MongoDB features
- Available on AWS, GCP, and Azure
- No credit card required

## Step 1: Create an Atlas Account

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Click **Try Free** and sign up with email, Google, or GitHub
3. You'll be prompted to create your first cluster

## Step 2: Create a Free M0 Cluster

In the cluster creation wizard:
1. Select **M0 FREE** tier
2. Choose a cloud provider (AWS, GCP, or Azure)
3. Select the closest region to you
4. Give the cluster a name (e.g., `Cluster0`)
5. Click **Create Cluster**

Cluster provisioning takes 1-3 minutes.

## Step 3: Create a Database User

Before connecting, create a database user:

1. Go to **Security > Database Access**
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Set a username and strong password
5. Select **Atlas admin** role for full access during development
6. Click **Add User**

```text
Username: myDevUser
Password: SecurePassword123!
Role: Atlas admin
```

## Step 4: Configure Network Access

Allow your IP address:

1. Go to **Security > Network Access**
2. Click **Add IP Address**
3. For development, click **Allow Access from Anywhere** (adds `0.0.0.0/0`)
4. For production, always use specific IP addresses

For local development:

```bash
# Get your current IP
curl -s https://api.ipify.org
```

Add that specific IP in the Network Access panel.

## Step 5: Get Your Connection String

1. Click **Connect** on your cluster
2. Select **Connect your application**
3. Choose your driver and version
4. Copy the connection string

```text
mongodb+srv://myDevUser:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```

Replace `<password>` with your actual password.

## Step 6: Connect with mongosh

```bash
# Install mongosh
npm install -g mongosh

# Connect
mongosh "mongodb+srv://myDevUser:SecurePassword123!@cluster0.abc123.mongodb.net/"

# List databases
show dbs

# Create and use a database
use myapp

# Insert a test document
db.users.insertOne({ name: "Alice", email: "alice@example.com" })

# Query it
db.users.findOne()
```

## Step 7: Connect with Node.js

```javascript
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://myDevUser:SecurePassword123!@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas");

    const db = client.db("myapp");
    const users = db.collection("users");

    // Insert
    await users.insertOne({ name: "Bob", email: "bob@example.com", createdAt: new Date() });

    // Find
    const all = await users.find().toArray();
    console.log("Users:", all);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
```

## Step 8: Connect with Python (PyMongo)

```python
from pymongo import MongoClient

uri = "mongodb+srv://myDevUser:SecurePassword123!@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority"

client = MongoClient(uri)
db = client["myapp"]
users = db["users"]

# Insert
users.insert_one({"name": "Carol", "email": "carol@example.com"})

# Find all
for user in users.find():
    print(user)

client.close()
```

## Step 9: Use Environment Variables for Credentials

Never hardcode credentials. Use a `.env` file:

```bash
# .env
MONGODB_URI=mongodb+srv://myDevUser:SecurePassword123!@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
```

```javascript
require('dotenv').config();
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);
```

Add `.env` to `.gitignore`:

```text
.env
node_modules/
```

## M0 Limitations

- Maximum 500 simultaneous connections
- No dedicated RAM - shared with other users
- No custom roles or LDAP
- No backups or point-in-time recovery

Upgrade to M10 when you need production-grade features.

## Summary

Setting up a free MongoDB Atlas M0 cluster takes under 5 minutes: create an account, deploy a cluster, add a database user, configure IP access, and copy the connection string. Use environment variables for credentials and connect using mongosh or your preferred driver. The free tier is fully functional for development and learning, with no time limit.
