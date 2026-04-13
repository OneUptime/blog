# How to Use New Features in MongoDB 6.0

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, MongoDB 6.0, Queryable Encryption, Change Stream, New Features

Description: Explore MongoDB 6.0's major features including Queryable Encryption and change stream pre-images with practical implementation examples.

---

## MongoDB 6.0 Overview

MongoDB 6.0, released in 2022, introduced several major features:

- **Queryable Encryption** (Preview) - encrypt data client-side and query it without decryption on the server
- **Change Stream Pre-Images** - capture before/after document states in change events
- **Cluster-to-Cluster Sync** (mongosync) - continuous sync between clusters
- **$densify and $fill** - new aggregation stages for time series gaps
- **Improved time series** - secondary indexes, sharding support

## Queryable Encryption

Queryable Encryption encrypts sensitive fields on the client before they are sent to MongoDB. The server stores and queries ciphertext without ever seeing plaintext - even MongoDB engineers cannot read your data.

### Setting Up Queryable Encryption

Prerequisites: MongoDB 6.0 Enterprise or Atlas, MongoDB Driver 5.x, libmongocrypt.

```javascript
const { MongoClient, ClientEncryption } = require("mongodb")
const { BSON: { Binary } } = require("bson")

// Step 1: Create a local master key (in production, use KMS)
const localMasterKey = require("crypto").randomBytes(96)

// Step 2: Configure KMS providers
const kmsProviders = {
  local: { key: localMasterKey }
}

// Step 3: Configure auto-encryption
const encryptedClient = new MongoClient("mongodb://localhost:27017", {
  autoEncryption: {
    keyVaultNamespace: "encryption.__keyVault",
    kmsProviders,
    encryptedFieldsMap: {
      "mydb.patients": {
        fields: [
          {
            path: "ssn",
            bsonType: "string",
            queries: [{ queryType: "equality" }]  // allows equality queries on encrypted field
          },
          {
            path: "medicalRecord",
            bsonType: "string"
            // no queries - stored encrypted but not queryable
          }
        ]
      }
    }
  }
})
```

### Creating the Encrypted Collection

```javascript
await encryptedClient.connect()
const db = encryptedClient.db("mydb")

// Create the collection with encrypted fields
await db.createCollection("patients", {
  encryptedFields: {
    fields: [
      {
        path: "ssn",
        bsonType: "string",
        queries: [{ queryType: "equality" }]
      }
    ]
  }
})
```

### Inserting and Querying Encrypted Data

```javascript
// Insert - ssn is automatically encrypted before sending to server
await db.collection("patients").insertOne({
  name: "Alice Johnson",
  ssn: "123-45-6789",         // encrypted transparently
  medicalRecord: "Allergic to penicillin",  // encrypted
  dateOfBirth: new Date("1985-03-15")       // plaintext
})

// Query on encrypted field - works transparently!
const patient = await db.collection("patients").findOne({
  ssn: "123-45-6789"  // server never sees the plaintext SSN
})
console.log(patient.name)  // "Alice Johnson"
console.log(patient.ssn)   // "123-45-6789" (decrypted by driver)
```

## Change Stream Pre-Images

MongoDB 6.0 adds `fullDocumentBeforeChange` to change stream events, letting you capture the document state before an update or delete.

### Enabling Pre-Images on a Collection

```javascript
// Enable pre-images when creating
db.createCollection("orders", {
  changeStreamPreAndPostImages: { enabled: true }
})

// Enable on existing collection
db.runCommand({
  collMod: "orders",
  changeStreamPreAndPostImages: { enabled: true }
})
```

### Using Pre-Images in Change Streams

```javascript
const pipeline = []
const options = {
  fullDocument: "whenAvailable",
  fullDocumentBeforeChange: "whenAvailable"  // MongoDB 6.0+
}

const changeStream = db.collection("orders").watch(pipeline, options)

changeStream.on("change", event => {
  if (event.operationType === "update") {
    console.log("Before:", event.fullDocumentBeforeChange)
    console.log("After:", event.fullDocument)

    // Compare what changed
    const before = event.fullDocumentBeforeChange
    const after = event.fullDocument
    if (before.status !== after.status) {
      console.log(`Status changed: ${before.status} -> ${after.status}`)
    }
  }

  if (event.operationType === "delete") {
    console.log("Deleted document:", event.fullDocumentBeforeChange)
    // Useful for audit logs and undo functionality
  }
})
```

## $densify Stage (New in 6.0)

Fill in missing dates or numbers in a sequence:

```javascript
// Fill gaps in hourly data
db.sensorData.aggregate([
  { $match: { sensorId: "sensor-A" } },
  {
    $densify: {
      field: "timestamp",
      range: {
        step: 1,
        unit: "hour",
        bounds: [ISODate("2024-06-01T00:00:00Z"), ISODate("2024-06-02T00:00:00Z")]
      }
    }
  },
  {
    $fill: {
      sortBy: { timestamp: 1 },
      output: {
        temperature: { method: "linear" }  // linear interpolation
      }
    }
  }
])
```

## $fill Stage

Fill null values using a method or constant:

```javascript
db.salesData.aggregate([
  {
    $fill: {
      sortBy: { date: 1 },
      output: {
        quantity: { method: "locf" },          // last observation carried forward
        price: { value: 0 },                   // fill with constant
        region: { method: "locf" }
      }
    }
  }
])
```

## Checking Your Version

```javascript
db.adminCommand({ buildInfo: 1 }).version
// "6.0.x"

// Check feature compatibility
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
// { "featureCompatibilityVersion": { "version": "6.0" }, "ok": 1 }
```

## Summary

MongoDB 6.0 introduced Queryable Encryption for client-side field encryption with server-side query support, change stream pre-images for capturing document state before modifications, and the `$densify`/`$fill` aggregation stages for handling gaps in time series data. These features enable stronger data privacy, comprehensive audit logs, and cleaner analytics pipelines.
