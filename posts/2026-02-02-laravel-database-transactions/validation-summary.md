# Validation Summary: How to Handle Transactions in Laravel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PHP
- Laravel (DB facade, Eloquent ORM, Service classes, Jobs, Notifications, Mail)
- MySQL
- PostgreSQL (briefly, via isolation level discussion)
- SQLite (briefly mentioned in pitfalls)
- PHPUnit (Laravel testing framework with `RefreshDatabase` / `DatabaseTransactions` traits)
- Mermaid (diagram)

## Sources Consulted
- Laravel 11.x Database docs (transactions): https://laravel.com/docs/11.x/database#database-transactions
- Laravel 11.x Queries docs (pessimistic locking, `lockForUpdate`, `sharedLock`, `useWritePdo`): https://laravel.com/docs/11.x/queries
- Laravel 11.x Queues docs (`$afterCommit` on jobs, `after_commit` config): https://laravel.com/docs/11.x/queues
- Laravel 11.x Eloquent docs (events, observers, `$afterCommit` on observers): https://laravel.com/docs/11.x/eloquent
- Laravel framework source: `Illuminate\Database\Concerns\ManagesTransactions` (transaction attempts loop, `afterCommit` callback registration)
- Laravel framework source: `Illuminate\Database\Connectors\MySqlConnector::configureIsolationLevel` and `PostgresConnector::configureIsolationLevel` (verified both connectors honor the `isolation_level` config key)
- Laravel framework source: `Illuminate\Database\Query\Builder` (`sharedLock`, `useWritePdo` definitions)
- Diving Laravel: "Better Management of Database Transactions in Laravel 8" (afterCommit introduction)

## Issues Found

1. **Imprecise retry count wording in the deadlock section.** The post described `DB::transaction(fn, 5)` as "retry up to 5 times" and labeled the argument as the number of retries. The framework actually treats this argument as the total number of attempts (the `ManagesTransactions::transaction` method uses `for ($currentAttempt = 1; $currentAttempt <= $attempts; ...)`), so `5` means 5 total attempts (1 initial + 4 retries). Updated the prose and inline comments to refer to "attempts" rather than "retries" and clarified that `5` is the total attempt count.

2. **Misleading `lockForUpdate()` comment in the Best Practices section.** The comment claimed pessimistic locking "prevents other reads until transaction completes." `SELECT ... FOR UPDATE` blocks other writers/lockers but does not necessarily block plain non-locking reads from other transactions (read visibility is governed by isolation level / MVCC). Replaced the comment with a more accurate description: "prevents other transactions from modifying or locking these rows."

## Review Notes
- Initially suspected that `'isolation_level'` in `config/database.php` was a PostgreSQL-only key, but verification confirmed Laravel's `MySqlConnector::configureIsolationLevel` also honors it and emits `SET SESSION TRANSACTION ISOLATION LEVEL ...`. No change needed.
- Initially suspected the manual transaction example had a double-rollback bug (`DB::rollBack()` followed by a `throw` caught by a `catch` that also calls `DB::rollBack()`). Verification confirmed that a redundant rollback when the transaction counter is already 0 is a silent no-op in Laravel's `ManagesTransactions::performRollBack`, so the code as written is safe and was left unchanged.
- The "force read from primary connection" example uses `Order::on('mysql')->find()` inside a transaction. Inside an open transaction Laravel already routes reads through the write PDO automatically, so this snippet does not literally illustrate the read-replica failover concern in the surrounding prose. The concept being taught (force primary reads after a write when replicas may lag) is sound; the canonical method for forcing the write PDO outside a transaction is `useWritePdo()` on the query builder. Left as-is because the pedagogical intent is clear and the code is not incorrect, just slightly redundant in this context.
- `DB::afterCommit()` was introduced in Laravel 8.19 (Dec 2020); fine for any modern Laravel application.
- Spread-operator usage `[...$profileData]` for string-keyed arrays requires PHP 8.1+, which is consistent with current Laravel versions (Laravel 10+ requires PHP 8.1+).
- The dead-code line after `throw` in the rollback test (`$destination->increment(...)`) is intentional for illustration and will produce a static-analysis/linter warning but does not affect correctness.
