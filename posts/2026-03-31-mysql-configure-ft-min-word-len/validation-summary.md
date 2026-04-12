# Validation Summary: How to Configure ft_min_word_len for Full-Text Search in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (MyISAM and InnoDB storage engines)
- MySQL Full-Text Search
- MySQL server configuration (`my.cnf`)
- `ft_min_word_len` and `innodb_ft_min_token_size` system variables
- MySQL stopword configuration

## Sources Consulted
- MySQL 8.4 Reference Manual: Fine-Tuning MySQL Full-Text Search — https://dev.mysql.com/doc/refman/8.4/en/fulltext-fine-tuning.html
- MySQL 8.4 Reference Manual: Server System Variables (`ft_min_word_len`) — https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html
- MySQL 8.4 Reference Manual: InnoDB Startup Options and System Variables (`innodb_ft_min_token_size`) — https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html
- MySQL 8.4 Reference Manual: Full-Text Stopwords — https://dev.mysql.com/doc/refman/8.4/en/fulltext-stopwords.html
- MySQL 8.4 Reference Manual: INNODB_FT_DEFAULT_STOPWORD Table — https://dev.mysql.com/doc/refman/8.4/en/information-schema-innodb-ft-default-stopword-table.html
- MySQL 8.0 Reference Manual: Rebuilding or Repairing Tables — https://dev.mysql.com/doc/refman/8.0/en/rebuilding-tables.html

## Issues Found

1. **Incorrect default value for `innodb_ft_min_token_size`**: The introductory section stated "The default value is `4` for both variables." In reality, `ft_min_word_len` defaults to 4 (MyISAM) while `innodb_ft_min_token_size` defaults to 3 (InnoDB). The post even contradicted itself later in the "Check the Current Settings" section where it correctly noted "InnoDB defaults to 3, MyISAM defaults to 4." Fixed the introductory paragraph to state the correct defaults for each variable.

2. **`mysqlcheck --repair` presented as universal solution**: The post showed `mysqlcheck -u root -p --repair --all-databases` under a heading "Or for all tables" without clarifying that `REPAIR TABLE` (and thus `mysqlcheck --repair`) only applies to MyISAM tables, not InnoDB. Added a clarifying note that this only works for MyISAM and that InnoDB tables require the DROP INDEX / ADD INDEX approach.

## Review Notes
- The `SHOW VARIABLES` output example correctly shows the two variables with their respective defaults (4 for MyISAM, 3 for InnoDB) as separate query results, which is accurate.
- All SQL syntax (`REPAIR TABLE ... QUICK`, `ALTER TABLE ... DROP INDEX / ADD FULLTEXT INDEX`, `MATCH ... AGAINST ... IN BOOLEAN MODE`) is correct.
- The configuration file syntax for `my.cnf` is correct, and the note about requiring a server restart is accurate — neither variable is dynamic.
- The stopword configuration section is accurate: `INFORMATION_SCHEMA.INNODB_FT_DEFAULT_STOPWORD` is the correct table, `innodb_ft_enable_stopword = OFF` is a valid setting, and `ft_stopword_file = ''` correctly disables MyISAM stopwords.
- The "Choosing the Right Minimum Length" table header references `ft_min_word_len` only, but the guidance applies equally to `innodb_ft_min_token_size`. This is a minor clarity issue but not technically incorrect since the post title focuses on `ft_min_word_len`.
