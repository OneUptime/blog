# Validation Summary: How to Use ON DELETE SET NULL in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL DDL (CREATE TABLE, ALTER TABLE)
- Foreign key referential actions (ON DELETE SET NULL, ON UPDATE CASCADE)

## Sources Consulted
- MySQL 8.0 Reference Manual — FOREIGN KEY Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual — ALTER TABLE: https://dev.mysql.com/doc/refman/8.0/en/alter-table.html

## Issues Found

1. **Misleading SQL comment about NOT NULL error timing**: The SQL comment on the NOT NULL example said "This will fail at DELETE time or at table creation", but the surrounding text correctly states MySQL rejects the constraint at table creation time. Changed the comment to "This will fail at table creation" for consistency with the text and with MySQL's actual behavior (InnoDB rejects the foreign key definition at DDL time).

2. **SET DEFAULT listed without InnoDB caveat**: The comparison table listed `SET DEFAULT` as a valid ON DELETE option without noting that InnoDB does not support it. Per MySQL documentation, the parser recognizes `SET DEFAULT` but both InnoDB and NDB reject table definitions containing `ON DELETE SET DEFAULT` or `ON UPDATE SET DEFAULT`. Added a parenthetical note: "(parsed but not supported by InnoDB)".

## Review Notes
- All SQL syntax is correct and follows MySQL conventions (ENGINE=InnoDB, INT UNSIGNED, AUTO_INCREMENT).
- The example output accurately reflects what MySQL would produce after the DELETE.
- The three-step ALTER TABLE workflow (drop FK, modify column, re-add FK) is the correct approach for adding ON DELETE SET NULL to an existing table.
- The claim that NO ACTION is equivalent to RESTRICT in MySQL is correct for InnoDB — both reject the parent operation immediately if child rows exist.
