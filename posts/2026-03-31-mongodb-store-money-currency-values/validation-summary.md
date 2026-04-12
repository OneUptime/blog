# Validation Summary: How to Store Money/Currency Values in MongoDB

## Status
validated

## Post Type
Tutorial / Best Practices Guide

## Technologies Covered
- MongoDB (BSON types, aggregation framework, indexing)
- JavaScript / Node.js (MongoDB Node.js driver, `Intl.NumberFormat`)
- Python (PyMongo / bson module)
- mongosh (MongoDB Shell)
- IEEE 754 floating-point and Decimal128 (IEEE 754-2008 128-bit decimal)

## Sources Consulted
- MongoDB documentation on BSON Decimal128 type: https://www.mongodb.com/docs/manual/reference/bson-types/#decimal128
- MongoDB documentation on `NumberDecimal()` shell helper: https://www.mongodb.com/docs/manual/core/shell-types/#numberdecimal
- MongoDB Node.js driver `Decimal128` API: https://mongodb.github.io/node-mongodb-native/
- PyMongo `bson.Decimal128` documentation: https://pymongo.readthedocs.io/en/stable/api/bson/decimal128.html
- MongoDB aggregation `$group` and `$sum`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MDN `Intl.NumberFormat` documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
- ISO 4217 currency codes: https://www.iso.org/iso-4217-currency-codes.html
- IEEE 754 floating-point standard (0.1 + 0.2 behavior)

## Issues Found
No technical issues found.

## Review Notes
- The mongosh schema snippet shows `amountCents: 4999` as a plain JavaScript number. In practice, mongosh would store this as a BSON double (since JavaScript numbers are IEEE 754 doubles). For strict 64-bit integer storage, `NumberLong(4999)` would be more precise. However, since all integers up to 2^53 are exactly representable as doubles, this is not a correctness issue for typical financial amounts — it is acceptable as a schema illustration.
- The Decimal128 claim of "34 significant decimal digits" is accurate per the IEEE 754-2008 128-bit decimal specification.
- The post correctly notes that `$sum` and `$avg` aggregation operators work with Decimal128 fields, which has been supported since MongoDB 3.4.
- The schema math in the multi-currency example is verified correct: 3 x 2499 = 7497 (subtotal), 7497 + 600 = 8097 (total).
- The post could mention that some currencies use non-centesimal subdivisions (e.g., Japanese Yen has no subdivision, Kuwaiti Dinar uses 3 decimal places), which affects the integer cents approach — but this is a scope addition rather than a technical error.
