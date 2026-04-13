# How to Escape Special Characters in MongoDB Regex Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Regex, Security, Query, String

Description: Learn how to escape special characters in MongoDB regex queries to prevent pattern injection and ensure literal string matching.

---

## Introduction

When building MongoDB regex queries from user input or dynamic values, unescaped special characters can cause unexpected behavior or security vulnerabilities (regex injection). Characters like `.`, `*`, `+`, `?`, `(`, `)`, `[`, `]`, `{`, `}`, `^`, `$`, `|`, and `\` all have special meaning in regex and must be escaped to be treated as literals.

## Special Characters in MongoDB Regex

The following characters are regex metacharacters that must be escaped with `\` when you want to match them literally:

```text
. * + ? ^ $ { } [ ] ( ) | \
```

For example, searching for the literal string "1.2.3" without escaping would match "1X2Y3" because `.` matches any character.

## Escaping in JavaScript (Node.js Driver)

Create a reusable escape function:

```javascript
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Examples
console.log(escapeRegex("user.name+test"));
// Output: user\.name\+test

console.log(escapeRegex("price($)"));
// Output: price\(\$\)
```

Use it when building queries from user input:

```javascript
const userInput = "node.js";
const safePattern = escapeRegex(userInput);

db.packages.find({ name: new RegExp(safePattern, "i") });
// Matches literal "node.js", not "nodexjs"
```

## Escaping in Python (PyMongo)

Python's `re` module provides `re.escape()`:

```python
import re
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["mydb"]

user_input = "file.name[1]"
safe_pattern = re.escape(user_input)

results = db.files.find({"name": {"$regex": safe_pattern}})
```

`re.escape()` escapes all characters that have special meaning in a regular expression (changed in Python 3.7; earlier versions escaped all non-alphanumeric characters).

## Escaping in Java

Use `Pattern.quote()`:

```java
import java.util.regex.Pattern;
import com.mongodb.client.MongoCollection;
import org.bson.Document;

String userInput = "product(v2).pdf";
String safePattern = Pattern.quote(userInput);

Document query = new Document("filename", new Document("$regex", safePattern));
collection.find(query);
```

`Pattern.quote()` wraps the string in `\Q...\E` boundaries, treating everything inside as literal.

## Escaping in PHP

```php
$userInput = "file.txt";
$safePattern = preg_quote($userInput, '/');

$collection->find(['filename' => new MongoDB\BSON\Regex($safePattern, 'i')]);
```

`preg_quote()` escapes all regex metacharacters.

## What Happens Without Escaping

Without escaping, a user could submit a crafted input to manipulate the regex:

```text
User input: ".*"
Pattern: /.*/
Result: matches ALL documents - potential data exposure
```

Or cause catastrophic backtracking with a ReDoS attack:

```text
User input: "(a+)+" with long input
Result: exponential regex evaluation - CPU spike
```

## Best Practice: Use Literal String Matching When Possible

For equality checks, don't use regex at all:

```javascript
// Prefer exact match (uses index)
db.users.findOne({ email: "user@example.com" });

// Avoid regex for equality
db.users.findOne({ email: /^user@example\.com$/ });
```

Reserve regex for genuine pattern-matching needs and always escape dynamic input.

## Summary

Escaping special characters in MongoDB regex queries is essential when building patterns from user input or dynamic values. Each MongoDB driver language has a built-in mechanism: `replace(/[.*+?^${}()|[\]\\]/g, "\\$&")` in JavaScript, `re.escape()` in Python, `Pattern.quote()` in Java, and `preg_quote()` in PHP. Unescaped regex input can cause incorrect matches, data exposure, or CPU exhaustion from ReDoS attacks. When you only need exact string matching, avoid regex entirely and use equality queries for better performance and safety.
