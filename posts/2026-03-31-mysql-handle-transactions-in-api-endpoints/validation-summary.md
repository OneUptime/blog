# Validation Summary: How to Handle Database Transactions in API Endpoints with MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB transactions, `SELECT ... FOR UPDATE`, deadlock handling)
- Node.js with mysql2/promise (connection pooling, parameterized queries)
- Python Flask with SQLAlchemy (scoped sessions, context managers, `with_for_update()`)
- REST API design (error handling, HTTP status codes)

## Sources Consulted
- mysql2 npm package documentation: https://github.com/sidorares/node-mysql2
- MySQL 8.0 Reference Manual — InnoDB Locking Reads: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 Reference Manual — InnoDB Deadlocks: https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlocks.html
- SQLAlchemy Session API documentation: https://docs.sqlalchemy.org/en/20/orm/session_api.html
- SQLAlchemy `expire_on_commit` behavior: https://docs.sqlalchemy.org/en/20/orm/session_state_management.html
- Flask-SQLAlchemy scoped session documentation: https://flask-sqlalchemy.readthedocs.io/

## Issues Found
1. **Python code: `DetachedInstanceError` after transaction context manager exits.**
   - **What was wrong:** `order.to_dict()` was called *after* the `with transaction() as session:` block exited. At that point, `db.session.commit()` has already been called (which expires all ORM attributes with the default `expire_on_commit=True`), and `db.session.close()` has detached the object from the session. Accessing expired attributes on a detached object raises `sqlalchemy.orm.exc.DetachedInstanceError`.
   - **What was changed:** Moved the `order.to_dict()` call inside the `with` block (before commit/close), storing the result in a plain dict `order_data`. The `return jsonify(order_data), 201` now uses the pre-serialized dict, which is safe to access after the session is closed.
   - **Why:** After `session.flush()`, the order's attributes (including the auto-increment `id`) are available in memory. Serializing before commit captures the correct values. The plain dict survives session close without issues.

## Review Notes
- The Python code uses `session.query(Product).with_for_update().get(pk)`, which is a legacy SQLAlchemy 1.x Query API. In SQLAlchemy 2.0+, this is deprecated in favor of `session.get(Product, pk, with_for_update=True)` or the `select()` construct. The legacy API still works but may be removed in a future major version.
- The `withTransaction` helper does not guard against `connection.rollback()` itself throwing (e.g., on a lost connection). In that case the original error would be masked. This is a common simplification in tutorials and acceptable for the scope of this post.
- The deadlock retry uses linear backoff (`50 * attempt` ms). Exponential backoff with jitter would be more robust under high contention, but the linear approach is adequate for a tutorial example.
