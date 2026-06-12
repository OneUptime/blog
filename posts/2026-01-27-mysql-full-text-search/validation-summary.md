# Validation Summary: How to Use MySQL Full-Text Search

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL FULLTEXT indexes
- InnoDB and MyISAM storage engines
- MATCH() AGAINST() full-text search syntax
- Natural language, boolean, and query expansion search modes
- MySQL full-text stopword and token-size configuration
- MySQL OPTIMIZE TABLE and index rebuild behavior

## Sources Consulted
- MySQL 8.4 Reference Manual: Full-Text Search Functions - https://dev.mysql.com/doc/refman/8.4/en/fulltext-search.html
- MySQL 9.7 Reference Manual: Boolean Full-Text Searches - https://dev.mysql.com/doc/refman/9.7/en/fulltext-boolean.html
- MySQL 9.7 Reference Manual: Full-Text Stopwords - https://dev.mysql.com/doc/refman/9.7/en/fulltext-stopwords.html
- MySQL 9.7 Reference Manual: InnoDB Startup Options and System Variables - https://dev.mysql.com/doc/refman/9.7/en/innodb-parameters.html
- MySQL 5.7 Reference Manual: Fine-Tuning MySQL Full-Text Search - https://dev.mysql.com/doc/refman/5.7/en/fulltext-fine-tuning.html
- MySQL 9.7 Reference Manual: OPTIMIZE TABLE Statement - https://dev.mysql.com/doc/refman/9.7/en/optimize-table.html
- MySQL 8.0 Reference Manual: Full-Text Restrictions - https://dev.mysql.com/doc/refman/8.0/en/fulltext-restrictions.html
- MySQL 9.7 Reference Manual: InnoDB Full-Text Indexes - https://dev.mysql.com/doc/refman/9.7/en/innodb-fulltext-index.html
- MySQL 9.7 Reference Manual: Online DDL Operations - https://dev.mysql.com/doc/refman/9.7/en/innodb-online-ddl-operations.html

## Issues Found
- The post said adding a FULLTEXT index on a large table locks writes. MySQL's current InnoDB online DDL behavior is more nuanced: adding the first FULLTEXT index can rebuild the table, and OPTIMIZE TABLE on InnoDB FULLTEXT tables uses the table copy method, but the blanket write-lock statement was too strong. Updated the wording to say the operation may rebuild or copy the table and should be scheduled during low-traffic windows.
- The natural language mode description said MySQL parses the query "as a phrase." MySQL describes this as a phrase in free text, not an exact phrase search. Updated the wording to "free text" to avoid confusing natural language mode with quoted boolean phrase searches.
- The boolean phrase search comment said "exact phrase." MySQL phrase searching matches the same words in the same order, but nonword characters do not need to match exactly. Updated the comment to say the words must appear in order.
- The weighted scoring example used MATCH(title) and MATCH(body), but the setup only guaranteed a composite FULLTEXT index and a title FULLTEXT index. MySQL requires MATCH() columns to correspond to a FULLTEXT index. Added a body FULLTEXT index before the weighted query.
- The per-table stopword example used a CREATE TABLE COMMENT value for innodb_ft_user_stopword_table. Official MySQL documentation requires setting the innodb_ft_user_stopword_table system variable before creating the FULLTEXT index. Replaced the unsupported COMMENT pattern with SET SESSION innodb_ft_user_stopword_table before CREATE TABLE.
- The performance section referred to "covering indexes" and implied SELECT * fetches all columns before filtering. That was imprecise for FULLTEXT indexes. Updated the guidance to focus on fetching only needed columns.
- The performance section claimed a date predicate causes a full table scan before the full-text filter. MySQL optimizer behavior is plan-dependent, so this was too absolute. Updated the comments to describe the risk more accurately and to mark the candidate-set subquery as an alternative that is only appropriate when pre-limiting by full-text score is acceptable.

## Review Notes
The post is technically relevant and mostly accurate after the corrections. Future improvements could mention ngram and MeCab parser behavior for CJK languages, the lack of FULLTEXT support on partitioned tables in MySQL, and the 50% threshold difference between MyISAM natural language searches and InnoDB/boolean behavior.
