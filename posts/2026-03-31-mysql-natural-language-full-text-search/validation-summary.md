# Validation Summary: How to Use Natural Language Full-Text Search in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.6+, 8.0)
- InnoDB FULLTEXT indexes
- MyISAM FULLTEXT indexes
- SQL (MATCH ... AGAINST, EXPLAIN, ALTER TABLE)

## Sources Consulted
- MySQL 8.0 Reference Manual: Natural Language Full-Text Searches — https://dev.mysql.com/doc/refman/8.0/en/fulltext-natural-language.html
- MySQL 8.0 Reference Manual: Fine-Tuning MySQL Full-Text Search — https://dev.mysql.com/doc/refman/8.0/en/fulltext-fine-tuning.html
- MySQL 8.0 Reference Manual: Full-Text Stopwords — https://dev.mysql.com/doc/refman/8.0/en/fulltext-stopwords.html
- MySQL 8.0 Reference Manual: InnoDB Startup Options and System Variables — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html

## Issues Found
1. **50% threshold incorrectly presented as universal**: The post stated that words appearing in more than 50% of rows get zero relevance as a general MySQL rule. This 50% threshold is specific to MyISAM and does not apply to InnoDB. Since all examples in the post use `ENGINE=InnoDB`, this was misleading. Fixed in both the "Understanding Relevance Scoring" section and the Summary to clarify the threshold is MyISAM-specific and that InnoDB does not have this limitation.

2. **Missing index rebuild after stopword table change**: The post showed how to set `innodb_ft_server_stopword_table` but did not mention that existing FULLTEXT indexes must be rebuilt afterward for the change to take effect. Added the rebuild step (DROP INDEX / ADD FULLTEXT INDEX) after the stopword configuration example.

## Review Notes
- All SQL syntax is correct and would execute as expected on MySQL 5.6+ with InnoDB.
- The `innodb_ft_min_token_size` variable requires a server restart since it is not a dynamic variable. The post instructs editing `my.cnf`, which implicitly requires a restart, but does not state this explicitly. This is a minor clarity point rather than a technical error.
- The `ft_min_word_len` variable shown alongside `innodb_ft_min_token_size` is MyISAM-specific. The post does not misrepresent it but also does not clarify which engine each applies to.
