# How to Seed a MongoDB Database with Test Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Testing, Database, Development, Seed

Description: Learn how to seed a MongoDB database with test data using mongosh scripts, Faker.js, and Python Faker for consistent reproducible development environments.

---

Seeding a database with realistic test data helps developers build and test features without needing production data. A well-designed seed script is repeatable, idempotent, and produces realistic data distributions.

## Basic Seed Script in mongosh

The simplest approach is a mongosh JavaScript file:

```javascript
// seed.js
use testDatabase;

// Clear existing data
db.users.drop();
db.orders.drop();

// Seed users
const users = [];
for (let i = 1; i <= 50; i++) {
  users.push({
    _id: new ObjectId(),
    name: `User ${i}`,
    email: `user${i}@example.com`,
    createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 3600000),
    role: i % 5 === 0 ? "admin" : "member",
    active: Math.random() > 0.1
  });
}
db.users.insertMany(users);
print(`Inserted ${users.length} users`);

// Seed orders referencing users
const statuses = ["pending", "completed", "cancelled"];
const orders = [];
users.forEach(user => {
  const orderCount = Math.floor(Math.random() * 5) + 1;
  for (let j = 0; j < orderCount; j++) {
    orders.push({
      userId: user._id,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      amount: parseFloat((Math.random() * 500 + 10).toFixed(2)),
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 3600000)
    });
  }
});
db.orders.insertMany(orders);
print(`Inserted ${orders.length} orders`);
```

Run it:

```bash
mongosh mongodb://localhost:27017 seed.js
```

## Seed with Faker.js in Node.js

For realistic fake data, use the `@faker-js/faker` library:

```javascript
// seed.mjs
import { faker } from "@faker-js/faker";
import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://localhost:27017");
await client.connect();
const db = client.db("testDatabase");

await db.collection("users").drop().catch(() => {});

const users = Array.from({ length: 100 }, () => ({
  name:      faker.person.fullName(),
  email:     faker.internet.email().toLowerCase(),
  phone:     faker.phone.number(),
  address: {
    street: faker.location.streetAddress(),
    city:   faker.location.city(),
    country: faker.location.countryCode()
  },
  createdAt: faker.date.past({ years: 2 }),
  plan:      faker.helpers.arrayElement(["free", "pro", "enterprise"])
}));

const result = await db.collection("users").insertMany(users);
console.log(`Inserted ${result.insertedCount} users`);

await client.close();
```

Run with:

```bash
node seed.mjs
```

## Seed with Python and Faker

```python
# seed.py
from pymongo import MongoClient
from faker import Faker
import random

fake = Faker()
client = MongoClient("mongodb://localhost:27017")
db = client["testDatabase"]

db.products.drop()

products = []
categories = ["Electronics", "Clothing", "Books", "Home", "Sports"]

for _ in range(200):
    products.append({
        "name": fake.catch_phrase(),
        "sku": fake.bothify("SKU-????-####").upper(),
        "category": random.choice(categories),
        "price": round(random.uniform(5.99, 999.99), 2),
        "stock": random.randint(0, 500),
        "createdAt": fake.date_time_between(start_date="-1y", end_date="now")
    })

result = db.products.insert_many(products)
print(f"Inserted {len(result.inserted_ids)} products")
client.close()
```

## Idempotent Seed Pattern

Use `upsert` to make seeds safe to re-run:

```javascript
const seedUsers = [
  { email: "admin@example.com", name: "Admin User", role: "admin" },
  { email: "test@example.com",  name: "Test User",  role: "member" }
];

seedUsers.forEach(user => {
  db.users.updateOne(
    { email: user.email },
    { $setOnInsert: { ...user, createdAt: new Date() } },
    { upsert: true }
  );
});
```

`$setOnInsert` only writes fields when creating a new document, so re-running does not overwrite existing data.

## Summary

Use mongosh scripts for simple seeds, Faker.js (Node.js) or Faker (Python) for realistic data. Structure seed scripts to drop and recreate collections for a clean slate, or use upsert patterns for idempotent seeds. Always run seeds against non-production databases and isolate them behind environment variable checks.
