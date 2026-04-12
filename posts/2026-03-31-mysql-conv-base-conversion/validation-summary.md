# Validation Summary: How to Use CONV() Function in MySQL for Base Conversion

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (CONV(), BIN(), OCT(), HEX() functions)
- SQL numeric base conversion (bases 2-36)

## Sources Consulted
- MySQL 8.0 Reference Manual — Mathematical Functions: CONV() (https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_conv)
- MySQL 8.0 Reference Manual — String Functions: HEX(), BIN(), OCT() (https://dev.mysql.com/doc/refman/8.0/en/string-functions.html)
- Independent mathematical verification of all base conversion outputs using Python

## Issues Found

1. **Incorrect `to_base` description (syntax section):** The post stated "A negative value causes unsigned conversion." Per the MySQL documentation, a negative `to_base` causes *signed* conversion (preserving the minus sign for negative numbers). Positive bases treat numbers as unsigned. Fixed the description.

2. **Incorrect section title and explanation for negative number handling:** The section was titled "Negative `to_base` for Unsigned Representation" and stated "Using a negative `to_base` treats the number as unsigned." This is backwards — negative bases cause signed treatment, positive bases (used in the examples) cause unsigned treatment. The examples themselves were correct (showing `CONV(-1, 10, 16)` returning `'FFFFFFFFFFFFFFFF'`), but the explanation was wrong. Renamed section to "Negative Numbers and Unsigned Behavior" and corrected the explanation.

3. **Wrong base-36 conversion result for compact ID example:** `CONV(9876543210, 10, 36)` was claimed to return `'4LDQYJ'`. Verified mathematically that the correct result is `'4JC8LII'` (`4LDQYJ` in base 36 equals 277,778,107, not 9,876,543,210). Fixed both the forward and reverse conversion examples.

4. **Wrong NULL claim for valid base-36 input:** `CONV('GH', 36, 10)` was claimed to return `NULL` with a contradictory comment acknowledging both G and H are valid base-36 digits. G=16 and H=17 are indeed valid in base 36, so the result is `'593'` (16×36 + 17 = 593). Fixed the expected result and comment.

## Review Notes
- The `CONV('XYZ', 16, 10)` example claims the result is NULL. MySQL behavior for all-invalid input characters may vary — some versions return `'0'` instead of NULL. The post's claim is plausible but may not hold across all MySQL versions.
- The comparison table correctly notes that `HEX()` also works on strings (converting each byte to its hex value), which is a different behavior from `CONV()`.
- All other base conversion outputs (255 in various bases, 1000000/LFLS, hex color parsing, IP address octets) were verified mathematically and are correct.
