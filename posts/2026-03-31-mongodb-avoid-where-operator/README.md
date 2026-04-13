# How to Avoid Using $where for Queries in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Query, Anti-Pattern, Performance, Security

Description: Learn why $where is dangerous and slow in MongoDB, and how to replace it with native query operators that use indexes and avoid JavaScript injection risks.

---

The `$where` operator lets you write JavaScript expressions to filter MongoDB documents. While flexible, it is almost always the wrong choice. It is slow, cannot use indexes, runs JavaScript for every document, and introduces security risks. Every use of `$where` can be replaced with native MongoDB query operators.

## Why $where Is Problematic

When you use `$where`, MongoDB executes a JavaScript function against every document in the collection (or every document that passes earlier filter stages). This means:

1. **No index usage** - the query always becomes a collection scan
2. **High CPU overhead** - JavaScript evaluation per document
3. **Security risk** - vulnerable to NoSQL injection if user input reaches the expression
4. **Deprecated in newer drivers** - MongoDB is phasing out server-side JavaScript

```javascript
// BAD - uses $where, full collection scan, JavaScript per document
db.orders.find({
  $where: "this.quantity * this.price > 1000"
});
```

## Replacing $where with $expr

The `$expr` operator lets you use aggregation expression operators in query filters. It evaluates natively without JavaScript, and can use indexes for simple field-to-constant comparisons:

```javascript
// GOOD - $expr with aggregation operators, no JavaScript execution
db.orders.find({
  $expr: {
    $gt: [
      { $multiply: ["$quantity", "$price"] },
      1000
    ]
  }
});
```

`$expr` evaluates entirely within the MongoDB query engine without spawning JavaScript.

## Replacing Field Comparison with $expr

A common `$where` use case is comparing two fields in the same document:

```javascript
// BAD - $where for field comparison
db.shipments.find({
  $where: "this.deliveredDate < this.promisedDate"
});

// GOOD - $expr for field comparison
db.shipments.find({
  $expr: { $lt: ["$deliveredDate", "$promisedDate"] }
});
```

## Replacing Computed Value Filters

Another common use is filtering on a computed value:

```javascript
// BAD
db.products.find({
  $where: "this.stock / this.capacity < 0.1"
});

// GOOD - using $expr with $divide
db.products.find({
  $expr: {
    $lt: [
      { $divide: ["$stock", "$capacity"] },
      0.1
    ]
  }
});
```

## Replacing String Manipulation Queries

For string operations that `$where` was used for, use native string operators or `$regex`:

```javascript
// BAD - JavaScript string operation
db.users.find({
  $where: "this.email.indexOf('@company.com') !== -1"
});

// GOOD - native $regex
db.users.find({
  email: { $regex: "@company\\.com$", $options: "i" }
});

// EVEN BETTER - if you can anchor the regex, indexes can help
db.users.find({
  email: /^[^@]+@company\.com$/i
});
```

## Security: NoSQL Injection via $where

If user input reaches a `$where` expression, attackers can inject arbitrary JavaScript:

```javascript
// DANGEROUS - user controls 'userInput'
const userInput = "'; return true; //";  // injection payload
db.users.find({ $where: `this.username == '${userInput}'` });
// Evaluates to: this.username == ''; return true; //
// Returns ALL documents!
```

Native query operators do not execute code, making them immune to this class of attack.

## Summary

Replace every `$where` usage with native MongoDB query operators. Use `$expr` for computed comparisons and field-to-field comparisons, `$regex` for pattern matching, and standard comparison operators (`$gt`, `$lt`, `$eq`) for simple value comparisons. Native operators use indexes, avoid JavaScript execution overhead, and eliminate NoSQL injection risks - making them strictly better than `$where` in every measurable dimension.
