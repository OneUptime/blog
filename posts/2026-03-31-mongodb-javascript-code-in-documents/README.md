# How to Handle JavaScript Code in MongoDB Documents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, JavaScript, BSON, Security

Description: Learn about MongoDB's deprecated Code BSON type, why server-side JavaScript execution is disabled by default, and how to replace it with aggregation pipeline alternatives.

---

## The BSON Code Type

MongoDB historically supported a `Code` BSON type (type 13) that stores JavaScript source code as a string inside a document. A related type, `CodeWithScope` (type 15), also attaches a scope object. These types were used with server-side JavaScript execution via `$where` queries and `mapReduce`.

## Why Server-Side JavaScript Is Disabled

MongoDB deprecated `mapReduce` starting in MongoDB 5.0 and deprecated server-side JavaScript operators (`$where`, `$function`, `$accumulator`) in MongoDB 8.0. The reasons to avoid server-side JavaScript include:

- Security risks from arbitrary code execution on the server
- Poor performance compared to native aggregation operators
- Non-deterministic behavior in sharded clusters
- JavaScript runs in a single-threaded context, blocking other operations

The `security.javascriptEnabled` setting in `mongod.conf` defaults to `true`. Setting it to `false` disables `$where`, `$accumulator`, and `$function` operators.

## Storing Code BSON Type in mongosh

Although no longer recommended, you can still store `Code` objects:

```javascript
// Store JavaScript source code as a BSON Code type
db.scripts.insertOne({
  name: "greetingFn",
  code: Code("function greet(name) { return 'Hello, ' + name; }")
});

const doc = db.scripts.findOne({ name: "greetingFn" });
print(doc.code); // Code("function greet(name) { return 'Hello, ' + name; }")
```

## Why You Might Store Code as a String Instead

For application-managed scripts (config-driven logic, stored procedures), plain strings are far more portable:

```javascript
db.scripts.insertOne({
  name: "discount-rule",
  language: "javascript",
  source: "function applyDiscount(price, pct) { return price * (1 - pct / 100); }",
  updatedAt: new Date()
});
```

The application retrieves the string and evaluates it in a sandboxed context using a VM module or external engine.

## Replacing $where with Aggregation

Old pattern using `$where` (avoid):

```javascript
// Deprecated - requires server-side JS
db.orders.find({ $where: "this.total > this.budget" });
```

Modern replacement using `$expr`:

```javascript
db.orders.find({ $expr: { $gt: ["$total", "$budget"] } });
```

## Replacing mapReduce with Aggregation

Old `mapReduce` with Code type (deprecated):

```javascript
// Avoid this pattern
db.sales.mapReduce(
  function() { emit(this.category, this.amount); },
  function(key, values) { return Array.sum(values); },
  { out: "sales_by_category" }
);
```

Aggregation replacement:

```javascript
db.sales.aggregate([
  { $group: { _id: "$category", total: { $sum: "$amount" } } },
  { $out: "sales_by_category" }
]);
```

## $function for Edge Cases (When Enabled)

If server-side JavaScript is enabled and you need custom logic unavailable in native operators, use `$function`:

```javascript
db.products.aggregate([
  {
    $addFields: {
      slug: {
        $function: {
          body: "function(name) { return name.toLowerCase().replace(/\\s+/g, '-'); }",
          args: ["$name"],
          lang: "js"
        }
      }
    }
  }
]);
```

## Summary

MongoDB's BSON `Code` type stores JavaScript source as document data. However, server-side JavaScript execution is disabled by default for security and performance reasons. Replace `$where` with `$expr`, `mapReduce` with aggregation pipelines, and store scripts as plain strings evaluated client-side. Use `$function` only as a last resort when native operators cannot express the required logic.
