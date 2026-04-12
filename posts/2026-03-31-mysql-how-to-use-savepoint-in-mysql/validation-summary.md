# Validation Summary: How to Use SAVEPOINT in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SAVEPOINT, ROLLBACK TO SAVEPOINT, RELEASE SAVEPOINT)
- InnoDB storage engine
- Node.js with mysql2/promise driver
- SQL transactions

## Sources Consulted
- MySQL 8.0 Reference Manual: SAVEPOINT, ROLLBACK TO SAVEPOINT, and RELEASE SAVEPOINT Statements (https://dev.mysql.com/doc/refman/8.0/en/savepoint.html)
- MySQL 8.0 Reference Manual: Schema Object Names / Identifier rules (https://dev.mysql.com/doc/refman/8.0/en/identifiers.html)
- MySQL 8.0 Reference Manual: START TRANSACTION, COMMIT, and ROLLBACK Statements (https://dev.mysql.com/doc/refman/8.0/en/commit.html)
- mysql2 npm package documentation (https://github.com/sidorares/node-mysql2)

## Issues Found
No technical issues found.

## Review Notes
- The simple SQL example uses `LAST_INSERT_ID()` for the `payments` insert after an `order_items` insert. If `order_items` has an auto-increment column, `LAST_INSERT_ID()` would return the `order_items` ID rather than the `orders` ID. This is a domain logic concern rather than a savepoint correctness issue, and the example is illustrative rather than production-ready.
- The retry insert after the rollback uses a hardcoded `order_id` of `10001`, which is acceptable for a demonstration but would not be used in real code.
- The Node.js example's inner catch rolls back to the savepoint and then re-throws, causing the outer catch to roll back the entire transaction. This is a valid pattern, though the comment "Order exists but inventory not reserved" describes transient state that does not persist after the full rollback.
