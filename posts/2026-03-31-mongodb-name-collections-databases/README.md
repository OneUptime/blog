# How to Name Collections and Databases in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Naming Convention, Collection, Database, Best Practice

Description: Follow MongoDB naming conventions for databases and collections to avoid reserved word conflicts, driver issues, and operational problems.

---

## Overview

MongoDB collection and database names seem flexible, but choosing names carelessly leads to subtle bugs, driver compatibility issues, and operational confusion. Following a consistent naming convention prevents conflicts with reserved names, keeps shell commands predictable, and makes it easier to write portable queries.

## Database Naming Rules

MongoDB database names must follow these constraints:

- Cannot contain `/\. "$*<>:|?` or null characters
- Case-sensitive on Linux (but not Windows)
- Maximum length: 64 bytes
- Avoid `admin`, `local`, and `config` - these are reserved system databases

```javascript
// Good database names
const appDb = client.db("myapp");
const stagingDb = client.db("myapp_staging");
const analyticsDb = client.db("analytics_v2");

// Avoid: spaces, dots, uppercase mixing with lowercase
// Bad: "MyApp", "my.app", "my app"
```

## Collection Naming Conventions

Use lowercase with underscores (snake_case) or camelCase consistently across your application. Avoid hyphens - they require bracket notation in `mongosh`.

```javascript
// Preferred: snake_case
db.collection("user_profiles");
db.collection("order_line_items");
db.collection("audit_log_entries");

// Also acceptable: camelCase
db.collection("userProfiles");
db.collection("orderLineItems");

// Avoid: hyphens require bracket notation in shell
db["user-profiles"].find({});  // awkward in mongosh
```

## Avoiding Reserved Collection Names

MongoDB reserves these collection names for internal use:

```text
system.profile     - query profiler
system.users       - user authentication
system.roles       - role definitions
system.js          - server-side JavaScript
system.namespaces  - legacy namespace tracking
```

Never create collections starting with `system.` as they conflict with MongoDB internals.

## Naming Strategy for Multi-Tenant Applications

For applications hosting multiple tenants in a single database, prefix collections with the tenant identifier or use separate databases.

```javascript
// Option 1: prefixed collections (single database)
function tenantCollection(db, tenantId, collectionName) {
  return db.collection(`${tenantId}_${collectionName}`);
}

const col = tenantCollection(db, "acme", "invoices"); // acme_invoices

// Option 2: separate databases per tenant
function tenantDb(client, tenantId) {
  if (!/^[a-z][a-z0-9_]{0,37}$/.test(tenantId)) {
    throw new Error("Invalid tenant ID for database name");
  }
  return client.db(`tenant_${tenantId}`);
}
```

## Validating Names at Runtime

Add a utility to validate collection names before creating them dynamically.

```javascript
function validateCollectionName(name) {
  if (!name || typeof name !== "string") throw new Error("Name must be a non-empty string");
  if (name.startsWith("system.")) throw new Error("Cannot start with 'system.'");
  if (/[\x00$]/.test(name)) throw new Error("Cannot contain null bytes or '$'");
  if (name.length > 120) throw new Error("Name too long (max 120 chars)");
  return true;
}

// Usage
validateCollectionName("order_items"); // ok
validateCollectionName("system.js");   // throws
```

## Listing All Collections in a Database

```javascript
const collections = await db.listCollections().toArray();
const names = collections.map((c) => c.name).sort();
console.log("Collections:", names);
```

## Summary

MongoDB collection and database names should use lowercase snake_case, avoid hyphens and reserved names starting with `system.`, and stay well under the 255-byte namespace limit. In multi-tenant applications, choose between prefixed collection names in a shared database or separate databases per tenant based on isolation requirements. Always validate dynamically generated names to prevent runtime errors.
