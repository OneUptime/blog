# Validation Summary: How to Choose Between CHAR and VARCHAR in MySQL

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- MySQL (CHAR and VARCHAR data types)
- InnoDB storage engine
- MyISAM storage engine (mentioned in passing)

## Sources Consulted
- MySQL 8.0 Reference Manual — The CHAR and VARCHAR Types: https://dev.mysql.com/doc/refman/8.0/en/char.html
- MySQL 8.0 Reference Manual — String Type Storage Requirements: https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html#data-types-storage-reqs-strings
- MySQL 8.0 Reference Manual — SQL Mode (PAD_CHAR_TO_FULL_LENGTH): https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html#sqlmode_pad_char_to_full_length
- MySQL 8.0 Reference Manual — InnoDB Row Formats: https://dev.mysql.com/doc/refman/8.0/en/innodb-row-format.html

## Issues Found
1. **PAD_CHAR_TO_FULL_LENGTH misattributed to VARCHAR**: The original text read: "`CHAR` strips trailing spaces on retrieval. `VARCHAR` preserves them (unless `PAD_CHAR_TO_FULL_LENGTH` SQL mode is set)." The parenthetical was grammatically attached to the VARCHAR clause, implying PAD_CHAR_TO_FULL_LENGTH affects VARCHAR behavior. In reality, PAD_CHAR_TO_FULL_LENGTH only affects CHAR — when enabled, CHAR values are returned with their full trailing-space padding intact. VARCHAR behavior is unaffected by this SQL mode. Fixed by moving the parenthetical to the CHAR clause: "`CHAR` strips trailing spaces on retrieval (unless the `PAD_CHAR_TO_FULL_LENGTH` SQL mode is enabled). `VARCHAR` preserves them."

## Review Notes
- The storage size claims (e.g., "CHAR(10) always uses 10 bytes") are correct for single-byte character sets (like latin1). For multi-byte character sets (utf8mb3, utf8mb4), InnoDB COMPACT/DYNAMIC row formats store CHAR columns with variable length internally. The post does not mention character sets, which is a common simplification but could be clarified in a future revision.
- PAD_CHAR_TO_FULL_LENGTH was deprecated in MySQL 8.0.13 and removed in MySQL 8.0.32. The post does not mention this deprecation. A future update could note that this SQL mode is no longer available in recent MySQL versions.
- The claim that phone area codes are "always 3 digits" (CHAR(3)) is true for US/Canada (NANP) but not universally. This is a minor simplification in an example comment, not a technical error.
