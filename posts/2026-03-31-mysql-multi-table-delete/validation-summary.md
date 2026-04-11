# Validation Summary: How to Use Multi-Table DELETE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (multi-table DELETE, JOIN-based deletes, DML)

## Sources Consulted
- MySQL 8.0 Reference Manual: DELETE Statement — https://dev.mysql.com/doc/refman/8.0/en/delete.html
- MySQL 8.0 Restrictions on Subqueries — https://dev.mysql.com/doc/mysql-reslimits-excerpt/8.0/en/subquery-restrictions.html

## Issues Found

### 1. "Two Syntax Forms" section was misleading (High severity)
**What was wrong:** The blog presented two examples as "Form 1" and "Form 2," but both were actually the same MySQL syntax form (the `DELETE ... FROM` form). The blog's "Form 2" (`DELETE t1 FROM t1 INNER JOIN t2 ...`) was just Form 1 with a single target table, not a distinct syntax. MySQL's actual two multi-table DELETE syntax forms are:
- Form 1: `DELETE t1, t2 FROM table_references WHERE ...`
- Form 2: `DELETE FROM t1, t2 USING table_references WHERE ...`

The `USING`-based syntax was entirely omitted.

**What was changed:** Rewrote the "Two Syntax Forms" section to accurately show both official MySQL syntax forms — the `DELETE ... FROM` form and the `DELETE FROM ... USING` form — with correct descriptions of each.

## Review Notes
- The alias rule stated as "Aliases must be consistent throughout the statement" is technically correct but vague. The MySQL docs specify that aliases should be declared only in the table references part (FROM/USING clause), not after DELETE. This is a minor omission that doesn't cause incorrect behavior but could be more precise.
- The LIMIT workaround example is a single-table DELETE with a subquery, not a multi-table DELETE. This is contextually appropriate (showing how to work around the multi-table LIMIT restriction) but readers should note the distinction.
- The restriction about not referencing the deleted table in a subquery has an exception for materialized derived tables, which the blog omits. This is an advanced detail acceptable to leave out of a tutorial.
- All SQL examples are syntactically correct and use valid MySQL syntax.
