# Validation Summary: How to Handle Transactions in Rails

## Status
validated

## Post Type
Tutorial / Guide (comprehensive, code-heavy walkthrough of ActiveRecord transactions)

## Technologies Covered
- Ruby
- Ruby on Rails / ActiveRecord (7.x; migrations declared as `ActiveRecord::Migration[7.0]`)
- PostgreSQL (locking modes, isolation levels, advisory locks)
- Database transactions and ACID concepts
- StatsD (metrics example)

## Sources Consulted
- Active Record Query Interface — Locking (optimistic/pessimistic, `lock`, `with_lock`): https://guides.rubyonrails.org/active_record_querying.html#locking-records-for-update
- Active Record Transactions API (`transaction`, `requires_new`, `isolation`, savepoints): https://api.rubyonrails.org/classes/ActiveRecord/Transactions/ClassMethods.html
- Active Record Callbacks (`after_commit`, `after_rollback`, transactional callbacks): https://guides.rubyonrails.org/active_record_callbacks.html
- Active Support Instrumentation — `transaction.active_record` notification (Rails 7.1+, payload `:outcome`/`:connection`): https://guides.rubyonrails.org/active_support_instrumentation.html and https://www.bigbinary.com/blog/rails-7-1-allows-subscribing-to-active-record-transaction-events
- Rails ActiveRecord errors source (`SerializationFailure`, `Deadlocked`, `StaleObjectError` as subclasses of `TransactionRollbackError`/`StatementInvalid`): https://github.com/rails/rails/blob/main/activerecord/lib/active_record/errors.rb
- Multiple databases in Rails (`connects_to`): https://guides.rubyonrails.org/active_record_multiple_databases.html
- PostgreSQL transaction isolation and `pg_try_advisory_xact_lock` docs: https://www.postgresql.org/docs/current/transaction-iso.html , https://www.postgresql.org/docs/current/functions-admin.html

## Issues Found
1. **`account.frozen?` collided with Ruby's built-in `Object#frozen?`** (`TransferService.validate_transfer!`). The post used `from_account.frozen?` / `to_account.frozen?` to check a business "frozen account" status, but `frozen?` is Ruby's object-immutability predicate (and ActiveRecord uses it for destroyed/immutable records). For a normally loaded record it returns `false`, so the intended check would never fire. Changed to a domain method `account_frozen?` and added a comment explaining the collision.
2. **Advisory-lock result check was always truthy** (`IdempotentPaymentService`). `ActiveRecord::Base.connection.execute("SELECT pg_try_advisory_xact_lock(...)")` returns a raw `PG::Result` whose boolean value is the string `'t'` or `'f'` — and both strings are truthy in Ruby, so `unless result.first[...]` never triggered. Switched to `connection.select_value(...)`, which applies type casting and returns a real `true`/`false`, with an explanatory comment.
3. **`Rails.logger.warn`/`info` called with keyword arguments** (transaction monitoring initializer and `ConnectionPoolMonitor`). The default Rails/Ruby `Logger#warn`/`#info` accept a single message argument; passing `key: value` pairs raises `ArgumentError: wrong number of arguments`. Rewrote both calls to use interpolated single-string messages, preserving all the same logged fields.

## Review Notes
- The headline ActiveRecord facts are accurate: nested transactions are no-ops without `requires_new: true`, `raise ActiveRecord::Rollback` is swallowed by the block it is raised in, `requires_new` uses SAVEPOINTs, and the "Mistake 3" gotcha (Alice/Bob/Charlie all persist without `requires_new`) is correct.
- Exception classes are real and correctly used: `ActiveRecord::StaleObjectError` (optimistic locking), `ActiveRecord::Deadlocked` and `ActiveRecord::SerializationFailure` (both subclasses of `ActiveRecord::TransactionRollbackError`).
- Locking examples (`lock`, `lock('FOR UPDATE NOWAIT')`, `FOR UPDATE SKIP LOCKED`, `with_lock`) and PostgreSQL isolation-level options/notes (read uncommitted treated as read committed; read committed default) are correct.
- The `transaction.active_record` instrumentation is valid in Rails 7.1+; the inline comment `# :commit or :rollback` is a simplification (the full set is `:commit`, `:rollback`, `:restart`, `:incomplete`) but not wrong.
- Minor, left as-is (illustrative intent, not strictly incorrect): the comment "This will raise an error if stock is insufficient" next to `decrement!(:stock_count, ...)` is only true if a DB CHECK constraint or model validation forbids negative stock — `decrement!` alone will happily write a negative value. Readers relying on rollback for overselling should add such a constraint/validation.
- The optimistic-locking `rescue`/`retry` pattern that references `retry_count` and `product` defined inside the rescue/begin works because Ruby preserves method-local variables across `retry`; this is intentional and correct.
