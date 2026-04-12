# Validation Summary: How to Use NumberLong and NumberInt in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh shell, BSON types)
- BSON numeric types (NumberInt, NumberLong, Double)
- Node.js MongoDB/BSON driver (`bson` npm package)

## Sources Consulted
- MongoDB BSON Types documentation: https://www.mongodb.com/docs/manual/reference/bson-types/
- mongosh Data Types documentation: https://www.mongodb.com/docs/mongodb-shell/reference/data-types/
- MongoDB $type query operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/type/
- MongoDB $inc update operator documentation: https://www.mongodb.com/docs/manual/reference/operator/update/inc/
- Node.js BSON library API (Long, Int32): https://mongodb.github.io/node-mongodb-native/
- MongoDB NumberLong and NumberInt shell helpers documentation

## Issues Found
1. **Incorrect claim about mongosh default numeric type (line 19):** The post stated "In mongosh, plain integer literals are stored as `Double` by default." This was true for the legacy `mongo` shell but is incorrect for `mongosh`. In `mongosh`, integer literals are stored as `Int32` if they fit in 32 bits, or `Long` if they exceed 32-bit range but remain within the safe integer range. Fixed to clarify the distinction between the legacy shell and mongosh, and noted that explicit wrappers are still recommended for clarity and portability.

2. **Wrong output value in code comment (line 40):** The comment `// 32` after `print(doc.quantity)` was incorrect. The quantity was inserted as `NumberInt(50)`, so the printed output should be `50`, not `32`. The value `32` appears to have been confused with the 32-bit type width. Fixed to `// 50`.

## Review Notes
- The NumberLong range description only mentions the maximum positive value (9,223,372,036,854,775,807) without stating the minimum negative value (-9,223,372,036,854,775,808). This is a minor omission rather than an error, since it mirrors how NumberInt's range is listed with both bounds.
- The claim that "$inc preserves the field's existing BSON type" is a simplification. If the increment operand is a wider type (e.g., NumberLong increment on a NumberInt field), the result type is promoted to the wider type. The example shown (NumberLong incremented by NumberLong) is correct, but the general statement could be more nuanced.
- The aggregation section's claim that "$sum preserves integer types when possible" is a simplification. In practice, `$sum` in aggregation may promote Int32 to Long or Long to Double depending on overflow. The example is not wrong but readers should be aware of this behavior.
