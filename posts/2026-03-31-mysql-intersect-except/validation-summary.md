# Validation Summary: How to Use INTERSECT and EXCEPT in MySQL 8.0+

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.31+
- SQL set operators (INTERSECT, EXCEPT, INTERSECT ALL, EXCEPT ALL)

## Sources Consulted
- MySQL 8.0 Reference Manual — SET Operations with UNION, INTERSECT, and EXCEPT: https://dev.mysql.com/doc/refman/8.0/en/set-operations.html
- MySQL 8.0.31 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-31.html

## Issues Found
No technical issues found.

## Review Notes
- The post title says "MySQL 8.0+" while the feature actually requires MySQL 8.0.31+. The body correctly states 8.0.31 throughout, so this is acceptable as a general headline but readers should note the specific minimum version.
- All SQL examples are syntactically correct and produce the expected output based on the sample data provided.
- The INNER JOIN and LEFT JOIN anti-join emulation patterns for pre-8.0.31 are standard and correct.
- The note about INTERSECT/EXCEPT having higher precedence than UNION in MySQL 8.0.31+ could be a useful addition for advanced users combining multiple set operators, but is not necessary for the scope of this tutorial.
