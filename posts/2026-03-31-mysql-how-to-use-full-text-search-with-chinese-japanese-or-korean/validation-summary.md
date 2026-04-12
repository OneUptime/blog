# Validation Summary: How to Use Full-Text Search with CJK Text in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7.6+, 8.0)
- MySQL ngram full-text parser
- InnoDB full-text indexes
- utf8mb4 character set and collation
- MySQL full-text search (Natural Language and Boolean modes)

## Sources Consulted
- MySQL 8.0 Reference Manual — ngram Full-Text Parser: https://dev.mysql.com/doc/refman/8.0/en/fulltext-search-ngram.html
- MySQL 8.0 Reference Manual — Full-Text Search Functions: https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual — Server System Variables (ngram_token_size): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_ngram_token_size
- MySQL 8.0 Reference Manual — InnoDB Full-Text Index Tables: https://dev.mysql.com/doc/refman/8.0/en/innodb-fulltext-index.html

## Issues Found

1. **Missing cross-boundary bigram in ngram tokenization example (line 22):** The example tokenizing `MySQL数据库性能` with n=2 omitted the `L数` bigram at the Latin-to-CJK character boundary. The ngram parser generates contiguous n-character sequences across the entire string, so `L数` must be included. Fixed by adding the missing token to the list.

2. **Incorrect phrasing about search minimums (line 137):** The post stated that `ngram_token_size = 3` comes "at the cost of shorter search minimums." This is backwards — increasing the token size raises the minimum search term length from 2 to 3 characters. Fixed by changing "shorter search minimums" to "a longer minimum search term length."

## Review Notes
- The post correctly identifies MySQL 5.7.6 as the version that introduced the ngram parser.
- All SQL syntax (CREATE TABLE, ALTER TABLE, MATCH...AGAINST, BOOLEAN MODE, NATURAL LANGUAGE MODE) is correct.
- The recommendation to use `utf8mb4` over `utf8` (which only supports 3-byte UTF-8 in MySQL) is appropriate and important for CJK support.
- The `ngram_token_size` variable is correctly described as requiring a restart (it is a read-only system variable set at startup).
- The `innodb_ft_cache_size` tuning advice is reasonable for large CJK corpora (default is 8MB).
- The post does not mention MySQL's separate MeCab parser for Japanese morphological tokenization, which could be a useful addition in the future but is not an error.
