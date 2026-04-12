# How to Migrate from CSFLE to Queryable Encryption in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, CSFLE, Queryable Encryption, Migration, Security

Description: Step-by-step guide to migrating from MongoDB Client-Side Field Level Encryption (CSFLE) to the newer Queryable Encryption model with minimal downtime.

---

MongoDB's original Client-Side Field Level Encryption (CSFLE) uses deterministic or randomized algorithms. Queryable Encryption (QE) is the successor, offering structured encryption that supports equality and range queries with stronger security guarantees. Migrating requires a data transformation step because the two encryption formats are not compatible.

## Key Differences

| Feature          | CSFLE                           | Queryable Encryption             |
|------------------|---------------------------------|----------------------------------|
| Algorithm        | Deterministic / Randomized      | Structured Encryption            |
| Query support    | Equality only (deterministic)   | Equality (7.0+) + Range (8.0+)  |
| Metadata         | Schema map in driver config     | Encrypted field map + server collections |
| Minimum MongoDB  | 4.2                             | 7.0+                             |

## Migration Strategy

The safest approach is a dual-write migration:

1. Deploy new application code that writes QE-encrypted fields alongside CSFLE fields
2. Backfill existing documents by re-encrypting them
3. Switch reads to QE fields
4. Remove CSFLE fields

## Step 1 - Set Up the QE Key Vault

If you already have a key vault for CSFLE, you can reuse the namespace but create new Data Encryption Keys for QE:

```javascript
const encryption = new ClientEncryption(client, {
  keyVaultNamespace: "encryption.__keyVault",
  kmsProviders: { local: { key: localMasterKey } }
});

const qeDataKeyId = await encryption.createDataKey("local", {
  keyAltNames: ["qe-ssn-key"]
});
```

## Step 2 - Create the New QE Collection

Create a parallel collection with the QE encrypted field map:

```javascript
await db.createCollection("patients_v2", {
  encryptedFields: {
    fields: [
      {
        path: "ssn",
        bsonType: "string",
        keyId: qeDataKeyId,
        queries: { queryType: "equality" }
      }
    ]
  }
});
```

## Step 3 - Backfill Documents

Iterate through the old collection, decrypt with CSFLE client, and re-insert into the QE collection:

```javascript
const csfleCursor = csfleclient.db("mydb").collection("patients").find({});

for await (const doc of csfleCursor) {
  // doc.ssn is auto-decrypted by CSFLE client
  await qeClient.db("mydb").collection("patients_v2").insertOne({
    ...doc,
    _id: doc._id  // preserve the original _id
  });
}
```

## Step 4 - Validate and Cut Over

After backfilling, compare document counts:

```javascript
const oldCount = await db.collection("patients").countDocuments();
const newCount = await db.collection("patients_v2").countDocuments();
console.log({ oldCount, newCount, match: oldCount === newCount });
```

Once validated, update your application to use the new collection name and remove CSFLE configuration.

## Step 5 - Drop the Old Collection

```javascript
await db.collection("patients").drop();
await db.collection("patients_v2").rename("patients");
```

## Handling Live Traffic During Migration

For zero-downtime migration, use a feature flag to route writes to both collections simultaneously during the transition window. Only cut reads over to QE after backfill is complete.

```bash
# Monitor progress with a simple count check
mongosh mydb --eval "print(db.patients_v2.countDocuments())"
```

## Summary

Migrating from CSFLE to Queryable Encryption requires a data re-encryption step because the two formats are incompatible at the byte level. The recommended approach is to create a new QE collection, backfill with a dual-client script that decrypts CSFLE and re-encrypts with QE, validate counts, then rename the collection. Use feature flags to manage live traffic during the cutover window.
