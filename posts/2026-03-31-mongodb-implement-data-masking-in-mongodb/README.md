# How to Implement Data Masking in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Masking, Security

Description: Implement dynamic and static data masking in MongoDB to protect sensitive fields in development, testing, and analytics environments.

---

## What Is Data Masking

Data masking replaces sensitive values with realistic but fictitious data. It lets developers and analysts work with production-like data without exposing real PII, financial data, or health information. MongoDB supports two approaches: static masking (transform a copy of production data) and dynamic masking (mask data at query time for specific roles).

## Static Masking for Non-Production Environments

Create a masked copy of production data using an aggregation pipeline:

```javascript
// Mask users collection into a test database
db.users.aggregate([
  {
    $addFields: {
      email: {
        $concat: [
          { $toLower: { $substr: ["$firstName", 0, 1] } },
          ".",
          { $toLower: "$lastName" },
          "@example.com",
        ],
      },
      phone: "555-000-0000",
      ssn: "XXX-XX-XXXX",
      // Keep non-sensitive fields unchanged
      firstName: "$firstName",
      lastName: "$lastName",
      // Mask credit card - keep last 4 only
      creditCardLast4: { $substrCP: ["$creditCard", { $subtract: [{ $strLenCP: "$creditCard" }, 4] }, 4] },
      creditCard: "XXXX-XXXX-XXXX-0000",
    },
  },
  {
    $unset: ["password", "passwordHash", "securityAnswer"],
  },
  {
    $out: { db: "test_db", coll: "users" },
  },
])
```

## Masking Address Data

```javascript
const addressMaskPipeline = [
  {
    $addFields: {
      "address.street": {
        $concat: [
          { $toString: { $floor: { $multiply: [{ $rand: {} }, 9999] } } },
          " Test Street",
        ],
      },
      "address.city": "$address.city",     // keep city for regional data
      "address.zipCode": {
        $substr: ["$address.zipCode", 0, 3],  // keep first 3 digits
      },
    },
  },
]
```

## Dynamic Masking with MongoDB Views

Create a view that masks sensitive fields for non-privileged roles:

```javascript
// Create a masked view of the customers collection
db.createView("customers_masked", "customers", [
  {
    $addFields: {
      email: {
        $concat: [
          { $substr: ["$email", 0, 2] },
          "***@",
          { $arrayElemAt: [{ $split: ["$email", "@"] }, 1] },
        ],
      },
      phone: { $concat: [{ $substr: ["$phone", 0, 3] }, "-***-****"] },
      ssn:   "XXX-XX-XXXX",
    },
  },
  { $unset: ["creditCard", "bankAccount"] },
])

// Grant analysts access to the view only, not the base collection
db.createRole({
  role: "analystRole",
  privileges: [{
    resource: { db: "myapp", collection: "customers_masked" },
    actions: ["find"],
  }],
  roles: [],
})
```

## Application-Level Masking Middleware

For Node.js APIs, apply masking in a response middleware:

```javascript
const sensitiveFields = ['ssn', 'creditCard', 'bankAccount', 'password']

function maskDocument(doc) {
  const masked = { ...doc }
  sensitiveFields.forEach(field => {
    if (masked[field]) {
      masked[field] = '***REDACTED***'
    }
  })
  if (masked.email) {
    const [local, domain] = masked.email.split('@')
    masked.email = local.slice(0, 2) + '***@' + domain
  }
  return masked
}

// Express middleware
app.use((req, res, next) => {
  const originalJson = res.json.bind(res)
  res.json = (data) => {
    if (!req.user?.hasRole('admin')) {
      if (Array.isArray(data)) {
        return originalJson(data.map(maskDocument))
      }
      return originalJson(maskDocument(data))
    }
    return originalJson(data)
  }
  next()
})
```

## Generating Masked Test Data

```javascript
const { faker } = require('@faker-js/faker')

async function generateMaskedUsers(count) {
  const users = Array.from({ length: count }, () => ({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      zipCode: faker.location.zipCode(),
    },
    createdAt: faker.date.past(),
  }))

  await db.collection('users').insertMany(users)
}
```

## Summary

MongoDB data masking is implemented through three complementary techniques: static masking using aggregation pipelines with `$out` to generate sanitized copies for test environments, dynamic masking using MongoDB views with mask-transforming aggregation stages paired with role-based access control, and application-layer masking middleware for API responses. Choose the approach based on your use case - static for developer datasets, dynamic views for analytics, and middleware for per-user data visibility rules.
