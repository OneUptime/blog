# How to Model Relationships in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Data Modeling, Schema Design, NoSQL, Database Architecture

Description: Learn how to model one-to-one, one-to-many, and many-to-many relationships in MongoDB, with practical guidance on when to embed versus reference documents.

---

MongoDB does not enforce relationships like relational databases do, but your data still has relationships. Users have orders. Orders have items. Items belong to categories. How you model these relationships affects query performance, data integrity, and application complexity. The key decision is whether to embed related data or reference it.

## The Embedding vs Referencing Decision

```mermaid
flowchart TB
    Start{Relationship Type?}
    Start --> OneOne[One-to-One]
    Start --> OneMany[One-to-Many]
    Start --> ManyMany[Many-to-Many]

    OneOne --> Embed1[Usually Embed]
    OneMany --> Q1{How many?}
    Q1 -->|Few| Embed2[Embed in parent]
    Q1 -->|Many| Q2{Query patterns?}
    Q2 -->|Together| Embed3[Embed]
    Q2 -->|Separately| Ref1[Reference]
    ManyMany --> Ref2[Reference with<br/>array of IDs]
```

## One-to-One Relationships

When one document has exactly one related document.

### Embedding (Recommended)

```javascript
// User with profile - embedded
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0000"),
  email: "user@example.com",
  password: "hashed_password",
  profile: {
    firstName: "John",
    lastName: "Doe",
    avatar: "https://...",
    bio: "Software developer",
    location: "New York"
  },
  settings: {
    theme: "dark",
    notifications: true,
    language: "en"
  }
}
```

**Embed when:**
- Data is always accessed together
- Related document is not shared with others
- Combined document stays under 16MB limit

### Referencing (When Necessary)

```javascript
// User document
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0001"),
  email: "user@example.com",
  profileId: ObjectId("64b64c0f0f0f0f0f0f0f0002")  // Reference
}

// Separate profile collection
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0002"),
  userId: ObjectId("64b64c0f0f0f0f0f0f0f0001"),
  firstName: "John",
  lastName: "Doe",
  avatar: "https://..."
}
```

**Reference when:**
- Related document is very large
- You need to query the related document independently
- The related document might be shared (rare for 1:1)

## One-to-Many Relationships

One parent document has multiple child documents.

### Pattern 1: Embed Array (Few Children)

Best for small, bounded arrays that are accessed with the parent.

```javascript
// Order with embedded items (few items per order)
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0003"),
  customerId: ObjectId("64b64c0f0f0f0f0f0f0f0004"),
  status: "shipped",
  items: [
    {
      productId: ObjectId("64b64c0f0f0f0f0f0f0f0005"),
      name: "Widget",
      quantity: 2,
      price: 15.99
    },
    {
      productId: ObjectId("64b64c0f0f0f0f0f0f0f0006"),
      name: "Gadget",
      quantity: 1,
      price: 29.99
    }
  ],
  total: 61.97,
  createdAt: ISODate("2026-01-25T10:00:00Z")
}
```

**Advantages:**
- Single query retrieves everything
- Atomic updates to parent and children
- No joins needed

**Use when:**
- Array is bounded (e.g., items per order, addresses per user)
- Children are always accessed with parent
- Array will not grow indefinitely

### Pattern 2: Child References (Many Children)

Store references in the parent when you need to query children separately.

```javascript
// Blog post with comment IDs
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0007"),
  title: "MongoDB Data Modeling",
  content: "...",
  commentIds: [
    ObjectId("64b64c0f0f0f0f0f0f0f0008"),
    ObjectId("64b64c0f0f0f0f0f0f0f0009"),
    ObjectId("64b64c0f0f0f0f0f0f0f000a")
  ]
}

// Comments collection
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0008"),
  postId: ObjectId("64b64c0f0f0f0f0f0f0f0007"),  // Back-reference for queries
  author: "Jane",
  text: "Great post!",
  createdAt: ISODate("2026-01-25T12:00:00Z")
}
```

Query with $lookup:

```javascript
db.posts.aggregate([
  { $match: { _id: ObjectId("64b64c0f0f0f0f0f0f0f0007") } },
  {
    $lookup: {
      from: "comments",
      localField: "commentIds",
      foreignField: "_id",
      as: "comments"
    }
  }
]);
```

### Pattern 3: Parent Reference (Very Many Children)

Store reference to parent in each child. Best for unbounded relationships.

```javascript
// Blog post (no comment references)
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0007"),
  title: "MongoDB Data Modeling",
  content: "...",
  commentCount: 1523  // Denormalized count
}

// Comments reference the post
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0008"),
  postId: ObjectId("64b64c0f0f0f0f0f0f0f0007"),  // Parent reference
  author: "Jane",
  text: "Great post!",
  createdAt: ISODate("2026-01-25T12:00:00Z")
}

// Index for efficient queries
db.comments.createIndex({ postId: 1, createdAt: -1 });

// Get comments for a post
db.comments.find({ postId: ObjectId("64b64c0f0f0f0f0f0f0f0007") })
  .sort({ createdAt: -1 })
  .limit(20);
```

**Use when:**
- Children can number in thousands or more
- Children are often queried independently
- Children might belong to different parents over time

## Many-to-Many Relationships

Both sides can have multiple related documents.

### Pattern 1: Array of References

```javascript
// Student document
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f000b"),
  name: "Alice",
  enrolledCourseIds: [
    ObjectId("64b64c0f0f0f0f0f0f0f000d"),
    ObjectId("64b64c0f0f0f0f0f0f0f000e"),
    ObjectId("64b64c0f0f0f0f0f0f0f000f")
  ]
}

// Course document
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f000d"),
  title: "Introduction to MongoDB",
  enrolledStudentIds: [
    ObjectId("64b64c0f0f0f0f0f0f0f000b"),
    ObjectId("64b64c0f0f0f0f0f0f0f000c")
  ]
}
```

Query students in a course:

```javascript
db.students.find({
  enrolledCourseIds: ObjectId("64b64c0f0f0f0f0f0f0f000d")
});
```

Query courses for a student:

```javascript
db.courses.find({
  enrolledStudentIds: ObjectId("64b64c0f0f0f0f0f0f0f000b")
});
```

**Note:** Keeping both arrays synchronized requires careful application logic.

### Pattern 2: Junction Collection

For relationships with metadata or very large cardinality:

```javascript
// Students collection
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f000b"),
  name: "Alice"
}

// Courses collection
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f000d"),
  title: "Introduction to MongoDB"
}

// Enrollments junction collection
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0010"),
  studentId: ObjectId("64b64c0f0f0f0f0f0f0f000b"),
  courseId: ObjectId("64b64c0f0f0f0f0f0f0f000d"),
  enrolledAt: ISODate("2026-01-15T00:00:00Z"),
  grade: "A",
  status: "completed"
}

// Indexes for both directions
db.enrollments.createIndex({ studentId: 1, courseId: 1 }, { unique: true });
db.enrollments.createIndex({ courseId: 1 });
```

Query with aggregation:

```javascript
// Get student with all courses
db.students.aggregate([
  { $match: { _id: ObjectId("64b64c0f0f0f0f0f0f0f000b") } },
  {
    $lookup: {
      from: "enrollments",
      localField: "_id",
      foreignField: "studentId",
      as: "enrollments"
    }
  },
  {
    $lookup: {
      from: "courses",
      localField: "enrollments.courseId",
      foreignField: "_id",
      as: "courses"
    }
  }
]);
```

## Denormalization Strategies

### Duplicate Frequently Accessed Data

```javascript
// Order with denormalized product names and prices
// (original product might change, but order should reflect purchase-time values)
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0003"),
  items: [
    {
      productId: ObjectId("64b64c0f0f0f0f0f0f0f0005"),
      // Denormalized at purchase time
      name: "Widget Pro",
      price: 15.99,
      quantity: 2
    }
  ]
}
```

### Computed Fields

```javascript
// Maintain computed counts
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0007"),
  title: "MongoDB Guide",
  commentCount: 42,      // Updated when comments change
  likeCount: 128,        // Updated when likes change
  lastActivityAt: ISODate("2026-01-25T15:30:00Z")
}

// Update count when adding comment
db.posts.updateOne(
  { _id: postId },
  {
    $inc: { commentCount: 1 },
    $set: { lastActivityAt: new Date() }
  }
);
```

### Precomputed Summaries

Pre-compute complex aggregations:

```javascript
// Real-time: Calculate user stats on demand (slow)
db.orders.aggregate([
  { $match: { customerId: userId } },
  { $group: { _id: null, totalSpent: { $sum: "$total" }, orderCount: { $sum: 1 } } }
]);

// Better: Maintain precomputed summary fields
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0001"),
  email: "user@example.com",
  stats: {
    totalOrders: 47,
    totalSpent: 2341.52,
    lastOrderDate: ISODate("2026-01-20T00:00:00Z")
  }
}

// Update stats when order is placed
db.users.updateOne(
  { _id: customerId },
  {
    $inc: { "stats.totalOrders": 1, "stats.totalSpent": orderTotal },
    $set: { "stats.lastOrderDate": new Date() }
  }
);
```

## Practical Example: E-commerce Schema

```javascript
// Products collection
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0005"),
  name: "Wireless Headphones",
  slug: "wireless-headphones",
  price: 79.99,
  categoryIds: [ObjectId("64b64c0f0f0f0f0f0f0f0011"), ObjectId("64b64c0f0f0f0f0f0f0f0012")],  // Many-to-many
  inventory: {
    quantity: 150,
    warehouse: "us-east"
  },
  ratings: {
    average: 4.5,
    count: 234
  }
}

// Categories collection (self-referential for hierarchy)
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0011"),
  name: "Electronics",
  slug: "electronics",
  parentId: null,  // Root category
  path: ["electronics"],
  productCount: 1250
}

{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0012"),
  name: "Audio",
  slug: "audio",
  parentId: ObjectId("64b64c0f0f0f0f0f0f0f0011"),
  path: ["electronics", "audio"],
  productCount: 324
}

// Orders collection
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0003"),
  orderNumber: "ORD-2026-001234",
  customerId: ObjectId("64b64c0f0f0f0f0f0f0f0001"),
  status: "shipped",

  // Denormalized customer info at order time
  shippingAddress: {
    name: "John Doe",
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001"
  },

  // Embedded items with denormalized product data
  items: [
    {
      productId: ObjectId("64b64c0f0f0f0f0f0f0f0005"),
      sku: "WH-001",
      name: "Wireless Headphones",  // Snapshot at purchase
      price: 79.99,                  // Price at purchase
      quantity: 1
    }
  ],

  subtotal: 79.99,
  tax: 7.12,
  shipping: 5.99,
  total: 93.10,

  createdAt: ISODate("2026-01-25T10:00:00Z"),
  updatedAt: ISODate("2026-01-25T14:30:00Z")
}

// Users collection
{
  _id: ObjectId("64b64c0f0f0f0f0f0f0f0001"),
  email: "john@example.com",
  profile: {
    firstName: "John",
    lastName: "Doe"
  },
  addresses: [  // Embedded array of addresses
    {
      id: "addr_1",
      type: "shipping",
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zip: "10001",
      isDefault: true
    }
  ],
  stats: {
    orderCount: 12,
    totalSpent: 1234.56,
    lastOrderDate: ISODate("2026-01-25T10:00:00Z")
  }
}
```

## Decision Framework

| Factor | Embed | Reference |
|--------|-------|-----------|
| Data accessed together | Yes | No |
| Data changes frequently | Reference | Embed if small |
| Array is bounded | Embed | Reference if unbounded |
| Need atomic updates | Embed | Requires transactions |
| Document size | Small (<16MB) | Large |
| Query patterns | Single collection | Multiple collections |

---

Good MongoDB schema design requires understanding your access patterns. Embed for data accessed together, reference for independently queried data, and denormalize strategically for read performance. The right model depends on how your application uses the data, not just how the data is logically related.
