# How to Use mongosh Snippets for Reusable Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongosh, Snippet, Automation, Developer Tool

Description: Learn how to create, install, and use mongosh snippets to package reusable database operations and share them across your team.

---

mongosh snippets are JavaScript packages that extend the shell with reusable commands. They let you encapsulate complex operations - like health checks, index audits, or schema inspections - into named functions that any team member can install and run.

## How Snippets Work

Snippets are npm-like packages published to a registry. mongosh ships with the official MongoDB Snippet Registry, but you can also use a custom registry.

## Installing a Snippet

Use the built-in `snippet` command:

```javascript
// Install the analyze-schema snippet
snippet install analyze-schema

// Install the mongocompat snippet for legacy mongo shell compatibility
snippet install mongocompat

// List installed snippets
snippet ls
```

## Using an Installed Snippet

After installing, call snippet functions directly in the shell:

```javascript
// Analyze schema of a collection (from analyze-schema snippet)
schema(db.orders)

// Use legacy mongo shell functions (from mongocompat snippet)
cat("/path/to/file.js")
listFiles("/data/db")
```

## Creating a Custom Snippet

Create a directory structure for your snippet:

```bash
mkdir my-mongo-snippets
cd my-mongo-snippets
npm init -y
```

Create the main file `index.js`:

```javascript
// index.js
function collectionStats(collectionName) {
  const stats = db.getCollection(collectionName).stats();
  print(`Collection: ${collectionName}`);
  print(`Documents: ${stats.count}`);
  print(`Storage size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
  print(`Index size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
}

function listLargeCollections(thresholdMB = 100) {
  const dbs = db.adminCommand({ listDatabases: 1 }).databases;
  for (const database of dbs) {
    const dbConn = db.getSiblingDB(database.name);
    for (const coll of dbConn.getCollectionNames()) {
      const stats = dbConn.getCollection(coll).stats();
      const sizeMB = stats.storageSize / 1024 / 1024;
      if (sizeMB > thresholdMB) {
        print(`${database.name}.${coll}: ${sizeMB.toFixed(2)} MB`);
      }
    }
  }
}

module.exports = { collectionStats, listLargeCollections };
```

Add a `package.json` entry for snippet metadata:

```json
{
  "name": "@mongosh/snippet-my-mongo-snippets",
  "snippetName": "my-mongo-snippets",
  "version": "1.0.0",
  "description": "Reusable MongoDB operations for our team",
  "main": "index.js",
  "license": "Apache-2.0"
}
```

## Using a Local Snippet

Load a local snippet file directly without publishing:

```javascript
// Load from a local file path
load("/path/to/my-mongo-snippets/index.js")

// Now call the functions
collectionStats("orders")
listLargeCollections(50)
```

## Auto-loading Snippets with .mongoshrc.js

Put snippet loads in `~/.mongoshrc.js` so they are always available:

```javascript
// ~/.mongoshrc.js
load("/usr/local/share/mongo-snippets/index.js");
print("Custom snippets loaded");
```

## Managing Snippets

```javascript
// Show help for an installed snippet
snippet help analyze-schema

// Update all snippets
snippet update

// Remove a snippet
snippet uninstall analyze-schema

// Search the registry
snippet search "index"
```

## Summary

mongosh snippets allow teams to standardize complex database operations as reusable, shareable JavaScript packages. Whether using registry snippets or local files, snippets reduce repetition and help enforce consistent database management practices across environments.

