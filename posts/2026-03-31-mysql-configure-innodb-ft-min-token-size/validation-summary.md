# Validation Summary: How to Configure innodb_ft_min_token_size in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- InnoDB Full-Text Search
- MySQL system variables and configuration

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Parameters — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_ft_min_token_size
- MySQL 8.0 Reference Manual: InnoDB Full-Text Indexes — https://dev.mysql.com/doc/refman/8.0/en/innodb-fulltext-index.html
- MySQL 8.0 Reference Manual: Fine-Tuning MySQL Full-Text Search — https://dev.mysql.com/doc/refman/8.0/en/fulltext-fine-tuning.html

## Issues Found
No technical issues found.

## Review Notes
- The official MySQL documentation specifically recommends `ALTER TABLE ... DROP INDEX` / `ALTER TABLE ... ADD INDEX` for rebuilding full-text indexes after changing `innodb_ft_min_token_size`. The post presents `OPTIMIZE TABLE` as an alternative, which is commonly cited in practice and the docs do state it "rebuilds the full-text index." The post already correctly presents DROP/ADD INDEX as the primary approach, so no change is needed, but readers should be aware the official fine-tuning guide specifically recommends the ALTER TABLE approach.
- The variable has a valid range of 0–16. The post discusses values of 1 and 2 but does not document the full range, which is acceptable for a focused tutorial.
- For MyISAM tables, the equivalent variable is `ft_min_word_len` (not discussed, which is appropriate since the post is scoped to InnoDB).
