# How to Set Up MongoDB Compass on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MongoDB, Databases, GUI

Description: Install and configure MongoDB Compass on Ubuntu for visual database management, schema analysis, query building, and performance profiling of MongoDB instances.

---

MongoDB's command-line shell works well for scripting and quick queries, but when you need to explore schema structure, analyze index usage, or understand query performance visually, MongoDB Compass is the right tool. It is the official GUI client for MongoDB and runs well on Ubuntu.

## What Compass Provides

Compass gives you:

- Visual schema exploration across collections
- A query builder with real-time result preview
- Index management and creation
- Aggregation pipeline builder with stage visualization
- Real-time performance metrics including server stats and slow operation detection
- Document editing with JSON form validation

## System Requirements

Before installing, confirm your system meets the requirements:

- Ubuntu 18.04 or later (64-bit)
- At least 4GB RAM (8GB recommended for large datasets)
- A running MongoDB instance (local or remote) to connect to

## Downloading MongoDB Compass

MongoDB provides Compass as a `.deb` package. Download the latest version:

```bash
# Check the MongoDB Compass releases page for the latest version number
# As of writing, download version 1.x
wget https://downloads.mongodb.com/compass/mongodb-compass_1.44.0_amd64.deb

# Alternatively, use curl
curl -LO https://downloads.mongodb.com/compass/mongodb-compass_1.44.0_amd64.deb
```

You can also get the latest download URL from the MongoDB website at [www.mongodb.com/try/download/compass](https://www.mongodb.com/try/download/compass).

## Installing Compass

```bash
# Install the downloaded package
sudo dpkg -i mongodb-compass_1.44.0_amd64.deb

# Fix any dependency issues
sudo apt install -f

# Verify the installation
mongodb-compass --version
```

On some Ubuntu systems you may see missing dependency errors from dpkg. The `apt install -f` command resolves these automatically.

## Launching Compass

Start Compass from the application menu or from the terminal:

```bash
mongodb-compass &
```

The `&` runs it in the background so your terminal remains usable.

## Connecting to MongoDB

On the Compass welcome screen, you will see a connection string input field.

### Connecting to a Local MongoDB Instance

```
mongodb://localhost:27017
```

Click "Connect" and Compass will list the available databases.

### Connecting to a Remote MongoDB Instance

```
mongodb://username:password@remote-host:27017/your_database?authSource=admin
```

For MongoDB Atlas or other cloud deployments, copy the connection string from the provider's dashboard and paste it into Compass.

### Connection with TLS

```
mongodb://username:password@remote-host:27017/?tls=true&tlsCAFile=/path/to/ca.pem
```

Compass supports all standard MongoDB connection string options.

## Exploring Your Data

### Schema Analysis

Click on a collection name to open it. The "Schema" tab analyzes a sample of documents and shows you the field structure, data types, and value distributions. This is particularly useful for collections that have evolved over time and may have inconsistent schemas.

For example, if you have a `users` collection, Compass will show you:

- What percentage of documents have each field
- The data type distribution for each field
- Min/max/average values for numeric fields
- Top values and their frequencies for string fields

### Running Queries

The "Documents" tab shows your collection contents with filter, project, sort, skip, and limit options.

```javascript
// Example filter to find documents matching a condition
// Enter in the Filter field:
{ "status": "active", "age": { "$gte": 18 } }

// Project only specific fields
{ "name": 1, "email": 1, "_id": 0 }

// Sort by creation date descending
{ "createdAt": -1 }
```

Compass validates your filter syntax in real time and shows the document count before you run the query.

### Aggregation Pipeline Builder

The "Aggregations" tab provides a visual pipeline builder. Add stages one at a time:

```javascript
// Stage 1: $match - filter documents
{ "status": "active" }

// Stage 2: $group - aggregate by field
{
  "_id": "$department",
  "count": { "$sum": 1 },
  "avgSalary": { "$avg": "$salary" }
}

// Stage 3: $sort - order results
{ "count": -1 }
```

Each stage shows a preview of the documents passing through, making it much easier to debug complex pipelines than writing them blind in the shell.

## Managing Indexes

Efficient queries require appropriate indexes. Navigate to the "Indexes" tab of any collection to see existing indexes and create new ones.

### Viewing Index Usage

Compass shows index size and whether each index has been used since the server started. Unused indexes waste memory and slow down writes - they should be reviewed and removed if not needed.

### Creating an Index

Click "Create Index" and specify:

- Field name and direction (1 for ascending, -1 for descending)
- Index options: unique, sparse, TTL expiration
- Index name (auto-generated if left blank)

For compound indexes, add multiple fields:

```javascript
// In the Create Index dialog, add fields:
// Field: "status", Type: 1 (asc)
// Field: "createdAt", Type: -1 (desc)
// This creates: { status: 1, createdAt: -1 }
```

## Using the Explain Plan

Before running an important query in production, use Compass to examine the execution plan.

1. Enter your filter in the Documents tab
2. Click the "Explain" button (looks like a lightning bolt)
3. Switch to "Visual Tree" view

Compass shows whether the query uses an index (IXSCAN) or does a full collection scan (COLLSCAN). A COLLSCAN on a large collection is a performance problem that needs an index.

## Real-Time Performance Monitoring

The "Performance" tab at the server level shows:

- Operations per second by type (insert, query, update, delete, command)
- Current connections
- Network I/O
- Memory usage

This is useful for spotting sudden changes in query patterns or connection spikes.

## Installing Compass in Readonly Mode

For environments where you want to allow data exploration without modification, Compass supports a readonly build. Download the readonly variant:

```bash
# Download the readonly version
wget https://downloads.mongodb.com/compass/mongodb-compass-readonly_1.44.0_amd64.deb
sudo dpkg -i mongodb-compass-readonly_1.44.0_amd64.deb
sudo apt install -f
```

The readonly version disables all write operations in the UI.

## Updating Compass

MongoDB releases Compass updates frequently. To update:

```bash
# Download the new version
wget https://downloads.mongodb.com/compass/mongodb-compass_NEW_VERSION_amd64.deb

# Install over the existing version
sudo dpkg -i mongodb-compass_NEW_VERSION_amd64.deb
```

Compass will prompt you when a new version is available when you launch it.

## Troubleshooting

If Compass fails to launch, check for missing libraries:

```bash
# Check for dependency issues
ldd /usr/bin/mongodb-compass | grep "not found"

# Install common missing libraries
sudo apt install -y libgconf-2-4 libatk1.0-0 libatk-bridge2.0-0 \
  libgdk-pixbuf2.0-0 libgtk-3-0 libgbm1 libasound2
```

If Compass connects but shows no databases, verify the MongoDB user has the necessary privileges:

```javascript
// In MongoDB shell, grant database listing privilege
db.grantRolesToUser("your_user", [{ role: "readAnyDatabase", db: "admin" }])
```

MongoDB Compass fills the gap between the flexibility of the mongo shell and the need to visually understand data structure and query behavior. For anyone regularly working with MongoDB on Ubuntu, it is worth having installed.
