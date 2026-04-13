# How to Format Output in mongosh (JSON, Table, etc.)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongosh, Output, JSON

Description: Learn how to control mongosh output format using printjson, EJSON, cursor iteration methods, and config settings to display data as JSON, tables, or custom formats.

---

## Default Output in mongosh

By default, mongosh pretty-prints documents using its built-in formatter with syntax highlighting and type annotations. Numeric documents show `NumberLong`, dates show `ISODate`, etc.

```javascript
db.orders.findOne();
// {
//   _id: ObjectId("507f1f77bcf86cd799439011"),
//   status: 'pending',
//   amount: 150.5
// }
```

## Outputting as Standard JSON

Use `printjson()` for pretty-printed JSON output, or `JSON.stringify()` for full control:

```javascript
const doc = db.orders.findOne();

// Pretty JSON
printjson(doc);

// Compact JSON string
print(JSON.stringify(doc));

// Pretty with indentation
print(JSON.stringify(doc, null, 2));
```

## EJSON for Extended Type Preservation

`EJSON` (Extended JSON) preserves BSON type information in a portable format:

```javascript
const doc = db.orders.findOne();

// EJSON stringify - preserves ObjectId, Date, NumberLong, etc.
print(EJSON.stringify(doc, null, 2));

// Parse EJSON back with type information
const parsed = EJSON.parse('{"_id":{"$oid":"507f1f77bcf86cd799439011"}}');
print(parsed._id instanceof ObjectId); // true
```

## Iterating Cursors with Custom Output

```javascript
// Custom table-style output
db.products.find({}, { name: 1, price: 1, _id: 0 }).forEach(doc => {
  print(`${doc.name.padEnd(20)} $${doc.price.toFixed(2)}`);
});
```

Output:

```text
Widget A             $9.99
Widget B             $14.99
Gadget Pro           $49.99
```

## Converting Cursor to Array for JSON Output

```javascript
const results = db.orders.find({ status: "pending" }).toArray();
print(JSON.stringify(results, null, 2));
```

## Using toJSON() on BSON Types

```javascript
const id = new ObjectId();
print(id.toJSON());         // "507f1f77bcf86cd799439011" (hex string)
print(id.toString());       // "507f1f77bcf86cd799439011"
print(id.toHexString());    // same as toString()
```

## Changing Output Mode in mongosh

```javascript
// Set inspect depth for nested objects (default is 6)
config.set("inspectDepth", Infinity);

// Disable telemetry
config.set("enableTelemetry", false);
```

## Redirecting Output to a File

Run mongosh in non-interactive mode to capture output:

```bash
mongosh "mongodb://localhost:27017" \
  --quiet \
  --eval "printjson(db.orders.find({status:'pending'}).toArray())" \
  > output.json
```

## Formatting Aggregation Results

```javascript
db.sales.aggregate([
  { $group: { _id: "$category", total: { $sum: "$amount" } } },
  { $sort: { total: -1 } }
]).forEach(row => {
  print(`${row._id.padEnd(15)} ${row.total.toFixed(2)}`);
});
```

## CSV-Style Output

```javascript
// Print CSV header and rows
print("orderId,status,amount");
db.orders.find().forEach(doc => {
  print(`${doc.orderId},${doc.status},${doc.amount}`);
});
```

## Summary

Control mongosh output with `printjson()` for formatted output, `JSON.stringify()` for standard JSON, and `EJSON.stringify()` to preserve BSON types. Use `forEach()` with template literals for custom tabular display, pipe output to files with `--eval` and shell redirection, and adjust `inspectDepth` via `config.set()` for deeply nested documents.
