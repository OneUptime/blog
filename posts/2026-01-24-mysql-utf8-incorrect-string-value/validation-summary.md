# Validation Summary: How to Fix 'Incorrect String Value' UTF-8 Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- MySQL character sets and collations
- MySQL utf8mb3 / utf8mb4 Unicode support
- MySQL SQL statements and INFORMATION_SCHEMA queries
- InnoDB row formats and index prefix limits
- MySQL server and client configuration files
- MySQL Connector/Python
- SQLAlchemy MySQL dialect
- Node.js mysql2 driver

## Sources Consulted
- MySQL 8.4 Reference Manual: Converting Between 3-Byte and 4-Byte Unicode Character Sets - https://dev.mysql.com/doc/refman/8.4/en/charset-unicode-conversion.html
- MySQL 9.7 Reference Manual: The utf8 Character Set (Deprecated alias for utf8mb3) - https://dev.mysql.com/doc/refman/9.7/en/charset-unicode-utf8.html
- MySQL 8.4 Reference Manual: Configuring Application Character Set and Collation - https://dev.mysql.com/doc/refman/8.4/en/charset-applications.html
- MySQL 9.7 Reference Manual: SET NAMES Statement - https://dev.mysql.com/doc/refman/9.7/en/set-names.html
- MySQL 5.7 Reference Manual: InnoDB Row Formats - https://dev.mysql.com/doc/refman/5.7/en/innodb-row-format.html
- MySQL Connector/Python Developer Guide: Connection Arguments - https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html
- SQLAlchemy 2.1 Documentation: MySQL and MariaDB Charset Selection - https://docs.sqlalchemy.org/en/21/dialects/mysql.html#charset-selection
- ICU Documentation: Regular Expressions - https://unicode-org.github.io/icu/userguide/strings/regexp.html
- mysql2 project documentation / package metadata - https://sidorares.github.io/node-mysql2/docs and https://www.npmjs.com/package/mysql2

## Issues Found
- The non-BMP diagnostic regex used `REGEXP '[^\x00-\xFFFF]'`, which is not a reliable MySQL pattern for supplementary Unicode code points. Changed it to a MySQL 8.0+ ICU-style range using `REGEXP '[\\x{10000}-\\x{10FFFF}]'` and added the version caveat.
- The explanation said MySQL `utf8` excludes "some Asian scripts," which was too broad because utf8mb3 supports BMP characters, including many common Asian scripts. Changed this to "supplementary CJK characters, historic scripts, and mathematical symbols."
- Two emoji insert examples had no emoji in the string, which made the verification examples ineffective. Added `😀` to the test insert and quick reference insert examples.
- The index-length section described `ROW_FORMAT=DYNAMIC` as generally recommended without noting the large-prefix/version dependency. Adjusted the comment to clarify that it applies to MySQL 5.7.7+ or installations with large prefix support.
- The quick reference INFORMATION_SCHEMA query did not filter by schema, so it could match the wrong table in another database. Added `TABLE_SCHEMA = 'your_database'`.
- The closing paragraph said MySQL `utf8` is "not true UTF-8" and implied utf8mb4 covers "characters from all world languages." Reworded this to "not full UTF-8" and limited the claim to Unicode supplementary characters supported by utf8mb4.

## Review Notes
- The `ALTER TABLE ... MODIFY content TEXT` examples are syntactically valid, but in real migrations users should preserve existing column attributes such as `NOT NULL`, defaults, generated expressions, and comments when rewriting a column definition.
- MySQL documentation notes that `init_connect` is not executed for users with `CONNECTION_ADMIN` or the deprecated `SUPER` privilege, so application-level connection charset configuration remains important.
- No live MySQL server was available in this workspace, so validation was performed against official documentation rather than by executing the SQL examples.
