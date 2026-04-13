# How to Implement GDPR Compliance with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GDPR, Compliance

Description: Implement GDPR compliance in MongoDB with data minimization, consent tracking, right-to-erasure, data portability, and audit logging patterns.

---

## GDPR and MongoDB

GDPR requires organizations processing EU personal data to implement several technical controls: lawful basis tracking, purpose limitation, data minimization, the right to be forgotten, data portability, and breach detection. MongoDB's flexible document model accommodates these requirements, but you must design them in explicitly.

## Data Minimization

Only collect what you need. Define a strict schema with validation:

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "consentTimestamp", "legalBasis"],
      properties: {
        email:            { bsonType: "string" },
        name:             { bsonType: "string" },
        consentTimestamp: { bsonType: "date" },
        legalBasis:       { enum: ["consent", "contract", "legitimate_interest"] },
        marketingOptIn:   { bsonType: "bool" },
      },
      additionalProperties: false,
    }
  }
})
```

## Consent Tracking

Store granular consent records separately from user data:

```javascript
db.consent_records.insertOne({
  userId: new ObjectId("..."),
  purpose: "marketing_emails",
  granted: true,
  timestamp: new Date(),
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  version: "privacy_policy_v2.1",
})
```

Query active consents before sending communications:

```javascript
async function hasConsent(userId, purpose) {
  const latest = await db.collection('consent_records').findOne(
    { userId: new ObjectId(userId), purpose },
    { sort: { timestamp: -1 } }
  )
  return latest?.granted === true
}
```

## Right to Erasure (Right to Be Forgotten)

Implement a deletion workflow that cascades across collections:

```javascript
async function eraseUserData(userId) {
  const session = client.startSession()
  session.startTransaction()

  try {
    const uid = new ObjectId(userId)
    // Delete or anonymize personal data
    await db.collection('users').deleteOne({ _id: uid }, { session })
    await db.collection('orders').updateMany(
      { userId: uid },
      { $unset: { billingAddress: "", shippingAddress: "" }, $set: { userId: "DELETED" } },
      { session }
    )
    await db.collection('consent_records').deleteMany({ userId: uid }, { session })

    // Log the erasure for audit purposes (no personal data)
    await db.collection('erasure_log').insertOne({
      erasedAt: new Date(),
      requestedBy: "user",
      recordsDeleted: { users: 1, consents: true, ordersPii: true },
    }, { session })

    await session.commitTransaction()
    console.log(`User ${userId} data erased`)
  } catch (err) {
    await session.abortTransaction()
    throw err
  } finally {
    session.endSession()
  }
}
```

## Data Portability Export

Generate a portable JSON export of all personal data:

```javascript
async function exportUserData(userId) {
  const uid = new ObjectId(userId)
  const [user, orders, consents] = await Promise.all([
    db.collection('users').findOne({ _id: uid }),
    db.collection('orders').find({ userId: uid }).toArray(),
    db.collection('consent_records').find({ userId: uid }).toArray(),
  ])

  return {
    exportedAt: new Date().toISOString(),
    personalData: { user, orders, consents },
  }
}
```

## Data Breach Detection

Enable MongoDB's audit log and monitor for unusual access patterns:

```yaml
# mongod.conf
security:
  authorization: enabled

auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/auditLog.json
  filter: '{ atype: "authCheck", "param.command": { $in: ["find", "update", "delete"] }, "param.ns": { $regex: "users" } }'
```

## Summary

GDPR compliance in MongoDB requires four technical implementations: schema validation to enforce data minimization, a separate consent record collection for lawful basis tracking, a transactional erasure workflow that anonymizes data across collections, and a data export endpoint for portability requests. Combine these with MongoDB's audit logging to detect and investigate potential breaches within the required 72-hour notification window.
