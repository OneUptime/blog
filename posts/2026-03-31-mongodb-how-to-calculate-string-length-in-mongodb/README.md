# How to Calculate String Length in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, String, Aggregation, strLenCP, Expression, Pipeline

Description: Learn how to calculate string length in MongoDB using $strLenCP and $strLenBytes operators in aggregation pipelines for validation and filtering.

---

## Introduction

MongoDB provides two operators for calculating string length in aggregation pipelines: `$strLenCP` counts Unicode code points (the correct choice for multi-byte characters), and `$strLenBytes` counts raw UTF-8 bytes. Use `$strLenCP` for most applications since it correctly handles international characters.

## Basic String Length

Calculate the length of a username field:

```javascript
db.users.aggregate([
  {
    $project: {
      username: 1,
      usernameLength: { $strLenCP: "$username" }
    }
  }
]);
```

## Filtering by String Length

Find all users with usernames between 3 and 20 characters:

```javascript
db.users.aggregate([
  {
    $match: {
      $expr: {
        $and: [
          { $gte: [{ $strLenCP: "$username" }, 3] },
          { $lte: [{ $strLenCP: "$username" }, 20] }
        ]
      }
    }
  }
]);
```

## Finding Documents with Empty or Short Fields

Identify records with missing or very short descriptions:

```javascript
db.products.aggregate([
  {
    $match: {
      $expr: { $lt: [{ $strLenCP: { $ifNull: ["$description", ""] } }, 10] }
    }
  },
  {
    $project: { name: 1, description: 1 }
  }
]);
```

## Validating Phone Number Length

Audit phone number fields for incorrect lengths:

```javascript
db.contacts.aggregate([
  {
    $addFields: {
      phoneLength: { $strLenCP: { $ifNull: ["$phone", ""] } }
    }
  },
  {
    $match: {
      $expr: {
        $or: [
          { $lt: ["$phoneLength", 7] },
          { $gt: ["$phoneLength", 15] }
        ]
      }
    }
  },
  {
    $project: { name: 1, phone: 1, phoneLength: 1 }
  }
]);
```

## $strLenCP vs $strLenBytes

For ASCII-only strings, `$strLenCP` and `$strLenBytes` return the same value. For multi-byte characters, they differ:

```javascript
db.test.aggregate([
  {
    $project: {
      text: 1,
      cpLength: { $strLenCP: "$text" },
      byteLength: { $strLenBytes: "$text" }
    }
  }
]);
```

For a Japanese string like "こんにちは" (5 characters, 15 bytes in UTF-8), `$strLenCP` returns 5 while `$strLenBytes` returns 15.

## Adding a Length Field for Sorting

Sort articles by title length:

```javascript
db.articles.aggregate([
  {
    $addFields: {
      titleLength: { $strLenCP: "$title" }
    }
  },
  { $sort: { titleLength: 1 } },
  { $project: { title: 1, titleLength: 1 } }
]);
```

## Summary

MongoDB's `$strLenCP` operator accurately counts Unicode code points in string fields, making it the right choice for international content. It is essential for validation pipelines that enforce character limits, data quality audits that find short or empty fields, and computed sorting by string length. Use `$strLenBytes` only when you specifically need the byte size for storage calculations.
