# Validation Summary: How MySQL Full-Text Search Works Internally

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- MySQL (5.6+)
- InnoDB Full-Text Search
- FULLTEXT indexes
- Inverted indexes (TF-IDF scoring)
- ngram parser (MySQL 5.7.6+)

## Sources Consulted
- MySQL 8.0 Reference Manual: Full-Text Search Functions — https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html
- MySQL 8.0 Reference Manual: InnoDB Full-Text Indexes — https://dev.mysql.com/doc/refman/8.0/en/innodb-fulltext-index.html
- MySQL 8.0 Reference Manual: Boolean Full-Text Searches — https://dev.mysql.com/doc/refman/8.0/en/fulltext-boolean.html
- MySQL 8.0 Reference Manual: Full-Text Stopwords — https://dev.mysql.com/doc/refman/8.0/en/fulltext-stopwords.html
- MySQL 8.0 Reference Manual: ngram Full-Text Parser — https://dev.mysql.com/doc/refman/8.0/en/fulltext-search-ngram.html
- MySQL 8.0 Reference Manual: innodb_ft_min_token_size — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_ft_min_token_size
- MySQL 8.0 Reference Manual: innodb_ft_server_stopword_table — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_ft_server_stopword_table

## Issues Found
No technical issues found.

## Review Notes
- The statement that boolean mode "does not rank by relevance by default" is a common simplification. Boolean mode does return a relevance score from MATCH...AGAINST, but it uses a simpler term-presence-based calculation rather than full TF-IDF scoring. The phrasing is acceptable for a tutorial-level post.
- The ngram substring matching example with 'oard' is correct given the default `ngram_token_size=2`, but readers should be aware that such searches may also match unrelated words containing any of the constituent bigrams ("oa", "ar", "rd") since boolean mode without explicit operators treats terms as OR.
- The post correctly focuses on InnoDB throughout. Readers working with MyISAM should note that the equivalent minimum word length variable is `ft_min_word_len` (default 4), and stopword handling differs.
