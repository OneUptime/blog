# How to Set Up MongoDB Atlas Free Tier Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Free Tier, Cloud Database, Getting Started

Description: Learn how to create a free MongoDB Atlas M0 cluster, configure network access, create a database user, and connect your first application in under 10 minutes.

---

## What is MongoDB Atlas Free Tier

MongoDB Atlas M0 is a permanently free shared cluster with 512 MB storage, 500 max connections, and no time limit. It is ideal for:
- Learning MongoDB.
- Development and prototyping.
- Small applications with limited traffic.
- Demos and side projects.

```mermaid
flowchart LR
    A[Sign up at cloud.mongodb.com]
    A --> B[Create M0 Free Cluster]
    B --> C[Create Database User]
    C --> D[Configure Network Access / IP Allowlist]
    D --> E[Get Connection String]
    E --> F[Connect Application]
```

## Step-by-Step Setup

### Step 1: Create an Atlas Account

Go to [cloud.mongodb.com](https://cloud.mongodb.com) and sign up with your email address or Google/GitHub account. Email verification is required.

### Step 2: Create a Free Cluster

After logging in:

1. Click **Build a Database**.
2. Select **Free** (M0 Shared).
3. Choose your cloud provider (AWS, Google Cloud, or Azure) and region closest to you.
4. Leave the cluster name as `Cluster0` or customize it.
5. Click **Create Deployment**.

The cluster typically provisions in 1-3 minutes.

### Step 3: Create a Database User

In the **Security Quickstart** panel:

1. Choose **Username and Password** authentication.
2. Enter a username (e.g., `myapp-user`).
3. Click **Autogenerate Secure Password** and save the password.
4. Click **Create User**.

The user is automatically granted `readWriteAnyDatabase` on the free tier.

You can also create users via the Atlas CLI:

```bash
atlas dbusers create readWriteAnyDatabase \
  --username myapp-user \
  --password "SecurePassword123!"
```

### Step 4: Configure Network Access

Atlas blocks all connections by default. Add your IP:

1. In the **Security Quickstart**, click **Add My Current IP Address**.
2. For development, you can also add `0.0.0.0/0` to allow connections from anywhere (not recommended for production).

Via Atlas CLI:

```bash
# Allow your current IP
atlas accessLists create --currentIp

# Allow all IPs (development only)
atlas accessLists create 0.0.0.0/0 --type cidrBlock --comment "Allow all - dev only"
```

### Step 5: Get the Connection String

1. Click **Connect** on your cluster.
2. Choose **Drivers**.
3. Select your driver (Node.js, Python, Java, etc.) and version.
4. Copy the connection string.

The connection string looks like:

```text
mongodb+srv://myapp-user:<password>@cluster0.abc12.mongodb.net/?retryWrites=true&w=majority
```

Replace `<password>` with your actual password.

## Connecting from Your Application

### Node.js (MongoDB Node.js Driver)

```javascript
const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://myapp-user:YourPassword@cluster0.abc12.mongodb.net/?retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas!");

    const db = client.db("myapp");
    const collection = db.collection("users");

    // Insert a test document
    const result = await collection.insertOne({
      name: "Test User",
      email: "test@example.com",
      createdAt: new Date()
    });
    console.log("Inserted:", result.insertedId);

    // Find the document
    const user = await collection.findOne({ email: "test@example.com" });
    console.log("Found:", user.name);

  } finally {
    await client.close();
  }
}

main().catch(console.error);
```

### Node.js with Mongoose

```javascript
const mongoose = require("mongoose");

const uri = "mongodb+srv://myapp-user:YourPassword@cluster0.abc12.mongodb.net/myapp?retryWrites=true&w=majority";

async function connect() {
  await mongoose.connect(uri);
  console.log("Mongoose connected to Atlas!");
}

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

async function main() {
  await connect();

  const user = await User.create({ name: "Alice", email: "alice@example.com" });
  console.log("Created:", user._id);

  await mongoose.disconnect();
}

main().catch(console.error);
```

### Python (PyMongo)

```python
from pymongo import MongoClient

uri = "mongodb+srv://myapp-user:YourPassword@cluster0.abc12.mongodb.net/?retryWrites=true&w=majority"

client = MongoClient(uri)
db = client["myapp"]
collection = db["users"]

# Insert a document
result = collection.insert_one({
    "name": "Alice",
    "email": "alice@example.com"
})
print("Inserted:", result.inserted_id)

# Find a document
user = collection.find_one({"email": "alice@example.com"})
print("Found:", user["name"])

client.close()
```

### Environment Variable Best Practice

Never hardcode connection strings. Use environment variables:

```javascript
// .env file (do not commit to git)
// MONGODB_URI=mongodb+srv://myapp-user:YourPassword@cluster0.abc12.mongodb.net/myapp

const { MongoClient } = require("mongodb");
require("dotenv").config();  // npm install dotenv

const client = new MongoClient(process.env.MONGODB_URI);
```

## Atlas Free Tier Limitations

```text
Feature                M0 Free Tier
-----------------------------------------
Storage                512 MB
RAM                    Shared
Max connections        500
Backups                No automated backups
Atlas Search           Available (limited indexes)
Triggers               Available
Data API               Deprecated (EOL Sept 2025)
Charts                 Available
Upgrade path           Upgrade to M10+ anytime
```

## Exploring the Atlas UI

After connecting, explore these features in the Atlas UI:

- **Browse Collections** - view and edit documents in a visual interface.
- **Atlas Search** - create full-text search indexes (available on M0 with limitations).
- **Performance Advisor** - get index recommendations based on query patterns (M10+ required).
- **Real-Time Performance** - monitor operation rates and connections.
- **Triggers** - run server-side functions on database events.
- **Charts** - build dashboards from your data.

## Accessing the Atlas CLI

```bash
# Install Atlas CLI
brew install mongodb-atlas-cli  # macOS
# or download from https://www.mongodb.com/try/download/atlascli

# Login
atlas auth login

# List clusters
atlas clusters list

# Get connection string
atlas clusters connectionStrings describe Cluster0
```

## Best Practices

- **Use environment variables** for connection strings - never hardcode credentials.
- **Upgrade to M10+** for production workloads that need dedicated resources, backups, and VPC peering.
- **Enable IP allowlisting** - restrict access to known IPs in production, not `0.0.0.0/0`.
- **Use strong, unique passwords** for database users.
- **Create application-specific users** with minimal required permissions (not `atlasAdmin`).
- **Monitor connection count** on free tier - the 500 connection limit can be hit by serverless functions without connection pooling.

## Summary

Setting up a MongoDB Atlas free tier cluster takes under 5 minutes: create an account, provision an M0 cluster, create a database user, add your IP to the allowlist, and copy the connection string. The M0 tier provides 512 MB storage with no time limit. Connect from Node.js, Python, or any MongoDB driver using the `mongodb+srv://` connection string. Store credentials in environment variables and upgrade to M10+ when you need production-grade features like automated backups and dedicated resources.
