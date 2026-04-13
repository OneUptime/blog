# How to Use mongosh Autocomplete and Help Features

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongosh, Autocomplete, Help

Description: Learn how to use mongosh's intelligent autocomplete, contextual help commands, and documentation lookup features to speed up development and reduce errors.

---

## Autocomplete in mongosh

mongosh provides tab-based autocomplete for database names, collection names, field names, and method names. Press `Tab` to complete or show suggestions.

```javascript
// Type "db." then press Tab to see all available methods
db.<Tab>
// Shows: adminCommand, aggregate, createCollection, dropDatabase, getCollection, runCommand, ...

// Type "db.orders." then press Tab
db.orders.<Tab>
// Shows: aggregate, countDocuments, createIndex, deleteMany, distinct, drop, find, ...
```

## Collection Name Autocomplete

After typing `db.`, mongosh autocompletes collection names from the current database:

```javascript
db.ord<Tab>
// Completes to: db.orders (if 'orders' is a collection)
```

## Shell Helper Autocomplete

Autocomplete also works for shell helpers:

```javascript
sh.<Tab>
// Shows: addShard, addTagRange, disableAutoSplit, enableSharding, getBalancerState, ...

rs.<Tab>
// Shows: add, addArb, conf, freeze, help, initiate, reconfig, remove, status, ...
```

## The help() Method

Call `.help()` on any MongoDB shell object to see available methods with descriptions:

```javascript
// General help
help()

// Help for a collection
db.orders.help()

// Help for the database object
db.help()

// Help for aggregation cursor
db.orders.aggregate([]).help()
```

## help() on Specific Methods

```javascript
// Get help for a specific method
db.collection.findOne.help()
db.collection.aggregate.help()
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Autocomplete |
| `Ctrl+R` | Reverse history search |
| `Ctrl+C` | Cancel current input |
| `Ctrl+D` | Exit mongosh |
| `Up/Down` | Navigate history |
| `Ctrl+L` | Clear screen |

## Reverse History Search

Press `Ctrl+R` and type part of a previous command to search backwards through history:

```text
(reverse-i-search)'find': db.orders.find({ status: "pending" })
```

## Inspecting Object Types

```javascript
// Check methods available on a cursor
const cursor = db.orders.find();
typeof cursor;  // object

// List all properties and methods
Object.getOwnPropertyNames(Object.getPrototypeOf(cursor));
```

## The .explain() Helper

Get help with query plans interactively:

```javascript
// Check what explain modes are available
db.orders.explain().find().help()
```

## Using Method Names Without Parentheses

Type a method name without parentheses to see its help information:

```javascript
db.orders.find
```

## Checking mongosh Version and Build Info

```javascript
mongosh --version             // from terminal
version()                     // mongosh shell version from inside mongosh
db.serverBuildInfo()          // detailed server build information
```

## Summary

mongosh's tab autocomplete covers database names, collection names, shell helper methods, and driver APIs. Use `db.collection.help()` for contextual method lists with descriptions, `Ctrl+R` for reverse history search, and `db.collection.explain().find().help()` to understand query plan options. These features significantly reduce the need to reference external documentation during interactive sessions.
