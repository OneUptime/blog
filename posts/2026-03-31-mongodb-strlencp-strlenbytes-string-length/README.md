# How to Use $strLenCP and $strLenBytes for String Length in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, String, Pipeline, Expression

Description: Learn the difference between $strLenCP and $strLenBytes in MongoDB aggregation and when to use each for accurately measuring string lengths.

---

## Overview

MongoDB provides two operators for measuring string length in aggregation pipelines: `$strLenCP` counts Unicode code points and `$strLenBytes` counts the raw bytes. Understanding the difference is important when working with multibyte character sets like UTF-8.

## $strLenCP - Code Point Length

`$strLenCP` returns the number of Unicode code points in a string. For ASCII text, this equals the number of characters. For most multibyte characters (like accented letters, CJK characters, or simple emoji), this counts each as one code point regardless of byte size. However, composite emoji sequences (such as flag emoji, skin-tone modified emoji, or family emoji joined with ZWJ) consist of multiple code points and will return counts greater than one.

```javascript
db.products.aggregate([
  {
    $project: {
      name: 1,
      nameLength: { $strLenCP: "$name" }
    }
  }
])
```

For `"cafe"`, the result is `4`. For `"caf\u00e9"` (with accented e), the result is also `4`.

## $strLenBytes - Byte Length

`$strLenBytes` returns the number of bytes used to encode the string in UTF-8. ASCII characters use 1 byte each, while characters outside the ASCII range use 2-4 bytes.

```javascript
db.products.aggregate([
  {
    $project: {
      name: 1,
      byteLength: { $strLenBytes: "$name" }
    }
  }
])
```

For `"cafe"`, the result is `4`. For `"caf\u00e9"`, the result is `5` because the accented `e` uses 2 bytes in UTF-8.

## Comparing Both on the Same Field

```javascript
db.content.aggregate([
  {
    $project: {
      text: 1,
      charCount: { $strLenCP: "$text" },
      byteCount: { $strLenBytes: "$text" },
      isMultibyte: {
        $gt: [
          { $strLenBytes: "$text" },
          { $strLenCP: "$text" }
        ]
      }
    }
  }
])
```

When `byteCount` exceeds `charCount`, the string contains multibyte characters.

## Filtering by String Length

You can use these operators in a `$match` stage by combining with `$expr`:

```javascript
db.usernames.aggregate([
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
])
```

This filters usernames between 3 and 20 characters (by code point count).

## When to Use Which Operator

Use `$strLenCP` when you care about how many characters the user sees, such as for display limits, username length validation, or text truncation.

Use `$strLenBytes` when you care about storage or network transfer sizes, such as when enforcing database field size limits or estimating document sizes.

```javascript
db.messages.aggregate([
  {
    $project: {
      content: 1,
      displayLength: { $strLenCP: "$content" },
      storageBytes: { $strLenBytes: "$content" },
      exceedsStorageLimit: {
        $gt: [{ $strLenBytes: "$content" }, 1024]
      }
    }
  }
])
```

## Summary

`$strLenCP` and `$strLenBytes` serve different purposes in MongoDB aggregation. Use `$strLenCP` to count Unicode code points, which aligns with user-perceived character count for most international text. Use `$strLenBytes` when measuring actual memory or storage consumption. For purely ASCII content, both return the same value, but for text containing multibyte UTF-8 characters, the results will differ.
