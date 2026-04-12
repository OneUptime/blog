# Validation Summary: How to Configure the Full-Text Stopword List in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB full-text search)
- MySQL full-text stopword configuration
- MySQL system variables (`innodb_ft_enable_stopword`, `innodb_ft_server_stopword_table`, `innodb_ft_user_stopword_table`)

## Sources Consulted
- MySQL 8.0 Reference Manual: Full-Text Stopwords — https://dev.mysql.com/doc/refman/8.0/en/fulltext-stopwords.html
- MySQL 8.0 Reference Manual: INNODB_FT_DEFAULT_STOPWORD Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-ft-default-stopword-table.html
- MySQL 8.0 Reference Manual: innodb_ft_server_stopword_table — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_ft_server_stopword_table
- MySQL 8.0 Reference Manual: innodb_ft_user_stopword_table — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_ft_user_stopword_table
- MySQL 8.0 Reference Manual: ft_stopword_file — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_ft_stopword_file

## Issues Found
- **Incorrect MyISAM stopword source**: The post originally stated "MyISAM reads from the `mysql.innodb_ft_default_stopword` table." This is wrong — `INNODB_FT_DEFAULT_STOPWORD` is an InnoDB-specific INFORMATION_SCHEMA table. MyISAM uses a completely separate stopword mechanism: a file specified by the `ft_stopword_file` system variable (which defaults to a built-in compiled list). Changed to: "MyISAM reads stopwords from a file specified by the `ft_stopword_file` system variable."

## Review Notes
- The claim that the InnoDB default stopword list contains 36 words is correct per the MySQL documentation.
- All SQL syntax is correct. The `db/table` format for `innodb_ft_server_stopword_table` is accurate.
- The custom stopword table schema (`value VARCHAR(30) NOT NULL` with `ENGINE = InnoDB`) matches what MySQL requires.
- The precedence behavior described (session `innodb_ft_user_stopword_table` overrides global `innodb_ft_server_stopword_table`) is accurate.
- The advice to rebuild full-text indexes after changing stopword configuration is correct and important.
