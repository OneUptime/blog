# Validation Summary: How to Use Transactions in MySQL with BEGIN, COMMIT, ROLLBACK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (DDL, DML, transaction control statements)
- ACID transaction properties

## Sources Consulted
- MySQL 8.0 Reference Manual: START TRANSACTION, COMMIT, and ROLLBACK Statements — https://dev.mysql.com/doc/refman/8.0/en/commit.html
- MySQL 8.0 Reference Manual: The InnoDB Transaction Model — https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-model.html
- MySQL 8.0 Reference Manual: Statements That Cause an Implicit Commit — https://dev.mysql.com/doc/refman/8.0/en/implicit-commit.html
- MySQL 8.0 Reference Manual: Flow Control Statements (IF) — https://dev.mysql.com/doc/refman/8.0/en/if.html
- MySQL 8.0 Reference Manual: SET TRANSACTION Statement — https://dev.mysql.com/doc/refman/8.0/en/set-transaction.html
- MySQL 8.0 Reference Manual: CHECK Constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA INNODB_TRX Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html

## Issues Found

1. **IF/THEN/ELSE used outside stored procedure context (Application Code Pattern section):** The original code used `IF @rows_updated = 0 THEN ... ELSE ... END IF` as a standalone SQL script. In MySQL, the `IF` statement is only valid inside stored programs (procedures, functions, triggers, events). Running this as plain SQL in the MySQL client would produce a syntax error. Fixed by wrapping the logic in a `CREATE PROCEDURE` block with `DELIMITER //`, declaring a local variable, and adding a `CALL transfer_funds();` invocation.

2. **Misleading comment on @@autocommit (Checking Transaction Status section):** The comment said "See if you're in a transaction" for `SELECT @@autocommit;`. This is inaccurate — `@@autocommit` only shows whether autocommit mode is enabled, not whether there is an active transaction. A session can have autocommit ON and still be inside an explicit transaction after `START TRANSACTION`. Changed the comment to: "Check if autocommit is enabled (does not indicate whether you are inside a transaction)."

## Review Notes
- The CHECK constraint (`balance >= 0`) used in the examples requires MySQL 8.0.16 or later. Earlier versions parse but silently ignore CHECK constraints. The post doesn't specify a minimum version, but since MySQL 8.0 is the current major release this is reasonable.
- The `INFORMATION_SCHEMA.INNODB_TRX` table is annotated as "(MySQL 8.0+)" but has actually been available since MySQL 5.5. This is not wrong (it does work in 8.0+) but slightly understates compatibility.
- The `SET SESSION transaction_isolation` syntax used in Best Practices is MySQL 8.0+ syntax. In MySQL 5.7, the equivalent variable was `tx_isolation`. Since 8.0 is current, this is appropriate.
- The ROLLBACK on Error section is correct but could note that MySQL does not automatically roll back a transaction when a single statement fails — the transaction remains active and requires an explicit ROLLBACK. The example handles this correctly by calling ROLLBACK explicitly.
