# Validation Summary: MySQL vs Oracle Database: Key Differences

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MySQL (Community Edition, InnoDB engine)
- Oracle Database (Standard Edition 2, Enterprise Edition, 12c+)
- SQL (MySQL and Oracle dialects)
- PL/SQL (Oracle procedural extension)
- MySQL Stored Procedures

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TABLE, AUTO_INCREMENT, Partitioning: https://dev.mysql.com/doc/refman/8.0/en/
- MySQL 8.0 Reference Manual — CREATE PROCEDURE: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- Oracle Database SQL Language Reference — FETCH FIRST, IDENTITY columns, CREATE SEQUENCE: https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/
- Oracle Database PL/SQL Language Reference — Exception handling, NO_DATA_FOUND, DBMS_OUTPUT: https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/
- Oracle Database Concepts — MVCC and Undo Tablespaces: https://docs.oracle.com/en/database/oracle/oracle-database/19/cncpt/

## Issues Found
1. **Oracle PL/SQL procedure: NO_DATA_FOUND exception would never fire from an UPDATE statement.** The original example used `EXCEPTION WHEN NO_DATA_FOUND` to handle the case where an employee is not found, but `UPDATE` statements do not raise `NO_DATA_FOUND` — they simply affect zero rows. The `NO_DATA_FOUND` exception is only raised by `SELECT INTO` statements when no rows are returned. Fixed by adding a `SELECT salary INTO v_current_salary` statement before the UPDATE so the exception handler is actually meaningful and would trigger correctly when the employee ID doesn't exist.

## Review Notes
- The Oracle `DEFAULT order_seq.NEXTVAL` syntax for using a sequence as a column default is valid for Oracle 12c+ but behaves differently from a true identity column: an explicit INSERT with NULL will insert NULL rather than the next sequence value. The post correctly shows the `GENERATED ALWAYS AS IDENTITY` approach separately as the 12c+ alternative.
- The MySQL stored procedure example omits transaction handling (no COMMIT), while the Oracle example includes it. This is a valid comparison point — MySQL often relies on autocommit mode or external transaction management.
- All SQL syntax examples are correct for their respective database versions.
