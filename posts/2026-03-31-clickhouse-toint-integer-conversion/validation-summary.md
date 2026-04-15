# Validation Summary: How to Use toInt8(), toInt16(), toInt32(), toInt64() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL
- ClickHouse type conversion functions (toInt8, toInt16, toInt32, toInt64 and OrZero/OrNull variants)

## Sources Consulted
- ClickHouse official documentation on type conversion functions: https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions
- ClickHouse official documentation on data types: https://clickhouse.com/docs/en/sql-reference/data-types/int-uint

## Issues Found

### Issue 1: Incorrect description of invalid string handling (line 18)
- **What was wrong:** The text stated "invalid strings return 0 (or throw with the `OrZero`/`OrNull` variants)" which inverts the actual behavior. The base `toIntN()` functions throw an exception on unparseable strings. The `OrZero` variants return 0 and the `OrNull` variants return NULL — they are the safe alternatives, not the ones that throw.
- **What was changed:** Replaced with "invalid strings throw an exception (use the `OrZero` or `OrNull` variants for safe handling)"
- **Why:** The original text would mislead readers into thinking the base function is safe and the variants are the dangerous ones, which is the opposite of reality.

### Issue 2: Overflow in "Choosing the Right Type" example (line 177)
- **What was wrong:** The example used `status_code = 404` with `toInt8(status_code - 200)`, producing `toInt8(204)`. Since Int8 max is 127, the value 204 overflows and wraps to -52. This directly contradicts the section's purpose of demonstrating how to choose the *correct* type for your data range.
- **What was changed:** Changed the example status code from `404` to `201`, so that `toInt8(201 - 200) = toInt8(1) = 1`, which fits within Int8 range.
- **Why:** An example about choosing the right type should not itself demonstrate choosing the wrong type. Using 201 (HTTP Created) gives an offset of 1, which correctly fits in Int8 and supports the stated guidance.

## Review Notes
- The overflow behavior section (toInt8(200) = -56, toInt8(-200) = 56) is correct and demonstrates wrap-around arithmetic accurately. However, readers should be aware that ClickHouse behavior on out-of-range numeric conversions may vary by version or settings — some configurations may throw exceptions instead of wrapping.
- The mermaid diagram labels the base function path as "Exception / Garbage" which is a reasonable simplification — for string inputs it throws, and for numeric overflow it wraps silently.
- The complete working example correctly shows that `toInt8OrNull('1500')` returns NULL because 1500 exceeds Int8 range, even though '1500' is a valid numeric string. This is an important nuance that is well demonstrated.
