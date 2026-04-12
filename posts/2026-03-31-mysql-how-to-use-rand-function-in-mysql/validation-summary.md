# Validation Summary: How to Use RAND() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SQL (RAND(), FLOOR(), MD5(), ORDER BY RAND(), stored procedures)

## Sources Consulted
- MySQL 8.0 Reference Manual: Mathematical Functions — RAND() (https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_rand)
- MySQL 8.0 Reference Manual: CREATE PROCEDURE syntax (https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html)
- MySQL 8.0 Reference Manual: Encryption and Compression Functions — MD5() (https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html#function_md5)

## Issues Found
1. **Random coupon assignment query was incorrect.** The original query used a JOIN with a non-correlated subquery (`SELECT id FROM coupons ORDER BY RAND() LIMIT 1`) in the ON clause. Because the subquery does not reference the outer table, MySQL evaluates it only once, meaning all orders would receive the same random coupon — not a different one per order as the comment stated. Fixed by simplifying the example to select a single random coupon with `ORDER BY RAND() LIMIT 1`, which is the practical pattern for assigning a coupon when processing an individual order.

## Review Notes
- `RAND()` returns a value v where `0 <= v < 1.0` (inclusive of 0, exclusive of 1). The post says "between 0 and 1" which is the conventional shorthand and matches MySQL's own documentation phrasing, so no change was made, but readers should be aware the upper bound is exclusive.
- The efficient random row selection technique (`WHERE id >= FLOOR(RAND() * MAX(id))`) has a known bias when there are gaps in the id column — rows immediately after a gap are more likely to be selected. The post correctly presents this as a faster alternative without claiming perfect uniformity, so no change was made.
- `MD5(RAND())` is fine for generating random tokens for non-security purposes. The post's performance considerations section correctly notes that `RAND()` should not be used for security-sensitive randomness.
