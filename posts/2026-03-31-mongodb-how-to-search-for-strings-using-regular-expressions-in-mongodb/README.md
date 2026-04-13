# How to Search for Strings Using Regular Expressions in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Regular Expression, Query, String Search, Aggregation

Description: Learn how to use regular expressions in MongoDB to perform flexible string pattern matching using $regex, options, and aggregation operators.

---

## Introduction

MongoDB supports regular expression (regex) pattern matching for querying string fields. You can use the `$regex` operator directly in queries or use `$regexMatch`, `$regexFind`, and `$regexFindAll` in aggregation pipelines. Regex queries are powerful for partial matches, case-insensitive searches, and complex string patterns.

## Using $regex in Queries

The simplest way to search strings with a regex is via the `$regex` operator in a `find()` query.

```javascript
// Find all users whose name starts with "John"
db.users.find({ name: { $regex: /^John/ } });

// Case-insensitive search
db.users.find({ name: { $regex: /john/i } });

// Using string form with options
db.users.find({ name: { $regex: "john", $options: "i" } });
```

## Regex Options

MongoDB supports several regex flags via the `$options` field:

```text
i - Case insensitive matching
m - Multiline anchor matching (^ and $ match line boundaries)
x - Extended mode (ignore whitespace and comments)
s - Dot (.) matches newline characters as well
```

Example using multiline mode:

```javascript
db.documents.find({
  content: { $regex: "^Section", $options: "m" }
});
```

## Anchors and Wildcards

Use anchors and wildcards to narrow or broaden your pattern:

```javascript
// Match strings ending with ".com"
db.emails.find({ address: { $regex: /\.com$/ } });

// Match strings containing a digit
db.products.find({ sku: { $regex: /\d/ } });

// Match strings with exactly 5 word characters
db.codes.find({ code: { $regex: /^\w{5}$/ } });
```

## Using $regexMatch in Aggregation

In aggregation pipelines, use `$regexMatch` to return a boolean indicating whether a field matches a pattern:

```javascript
db.articles.aggregate([
  {
    $project: {
      title: 1,
      isTech: { $regexMatch: { input: "$title", regex: /tech/i } }
    }
  }
]);
```

## Using $regexFind and $regexFindAll

`$regexFind` returns the first match, while `$regexFindAll` returns all matches with their capture groups and positions:

```javascript
db.logs.aggregate([
  {
    $project: {
      firstIP: {
        $regexFind: {
          input: "$message",
          regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/
        }
      }
    }
  }
]);

db.logs.aggregate([
  {
    $project: {
      allIPs: {
        $regexFindAll: {
          input: "$message",
          regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/
        }
      }
    }
  }
]);
```

## Filtering Documents with $regexMatch in $match

Combine `$regexMatch` with `$match` to filter documents based on regex results:

```javascript
db.products.aggregate([
  {
    $match: {
      $expr: {
        $regexMatch: { input: "$description", regex: /organic/i }
      }
    }
  }
]);
```

## Performance Considerations

Regex queries on unindexed fields cause full collection scans. To improve performance:

```javascript
// Create an index on the field you query with regex
db.users.createIndex({ email: 1 });

// Prefix anchored regexes (/^prefix/) can use indexes effectively
db.users.find({ email: { $regex: /^admin/ } });
```

Avoid leading wildcards like `/.*pattern/` on large collections - they bypass indexes.

## Practical Example - Search Users by Email Domain

```javascript
db.users.find(
  { email: { $regex: /@gmail\.com$/i } },
  { name: 1, email: 1 }
);
```

## Practical Example - Extract Version Numbers from Logs

```javascript
db.logs.aggregate([
  {
    $project: {
      versions: {
        $regexFindAll: {
          input: "$message",
          regex: /v\d+\.\d+\.\d+/
        }
      }
    }
  },
  { $match: { "versions.0": { $exists: true } } }
]);
```

## Summary

MongoDB's regex support covers both query-level matching with `$regex` and aggregation-level matching with `$regexMatch`, `$regexFind`, and `$regexFindAll`. For best performance, anchor patterns to prefixes and index fields used in regex searches. The aggregation operators let you extract and test patterns as part of data transformation pipelines.
