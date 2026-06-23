# Validation Summary: How to Implement Query Objects Pattern in Rails

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby
- Ruby on Rails
- ActiveRecord
- Query Objects design pattern
- RSpec (testing)
- PostgreSQL (full-text search, `DATE_TRUNC`, `ILIKE`)

## Sources Consulted
- ActiveRecord Query Interface guide — https://guides.rubyonrails.org/active_record_querying.html
- `ActiveRecord::QueryMethods#or` API docs (structural-compatibility requirement) — https://api.rubyonrails.org/classes/ActiveRecord/QueryMethods.html#method-i-or
- `ActiveRecord::QueryMethods#left_joins` / `left_outer_joins` API docs — https://api.rubyonrails.org/classes/ActiveRecord/QueryMethods.html#method-i-left_outer_joins
- `ActiveRecord::Batches#find_each` API docs — https://api.rubyonrails.org/classes/ActiveRecord/Batches.html
- Ruby argument-forwarding (`...`) — https://docs.ruby-lang.org/en/3.0/syntax/methods_rdoc.html
- PostgreSQL Full Text Search (`to_tsvector`, `plainto_tsquery`, `ts_rank`) — https://www.postgresql.org/docs/current/textsearch.html

## Issues Found
1. **`Products::BestSellersQuery#call` — invalid use of `.or` with structurally incompatible relations.**
   The original code chained `.or(@relation.where(orders: { id: nil }))` onto a relation that already had `.select(...)`, `.left_joins(order_items: :order)`, and table references. ActiveRecord's `Relation#or` requires both relations to be structurally compatible (differing only in `where`/`having` values); combining a relation that has `joins`/`select`/`references` with one (`Product.all`) that does not raises `ArgumentError: Relation passed to #or must be structurally compatible`. I removed the `.or(@relation.where(orders: { id: nil }))` line, leaving a valid best-sellers query (left join with a date filter on `orders`, grouped and ranked by `total_sold`). The remaining `COALESCE(...)` aggregates stay correct.

## Review Notes
- The post is PostgreSQL-specific in several places (`ILIKE`, `DATE_TRUNC`, `to_tsvector`/`plainto_tsquery`/`ts_rank`). This is appropriate and the post labels the full-text section as PostgreSQL, but readers on MySQL/SQLite would need adaptations (e.g., `LIKE` instead of `ILIKE`). Not an error.
- `OverviewQuery#order_stats` uses `.take.attributes` on an aggregate `select`; if the underlying table is empty, `.take` returns `nil` and `.attributes` would raise. This is an acceptable happy-path illustration, not a correctness bug worth changing.
- `Orders::FilterQuery` calls `params.symbolize_keys`; the RSpec examples pass plain hashes (works), and the controller passes `ActionController::Parameters` from `params.permit(...)` which responds to `symbolize_keys` in current Rails. No change needed.
- Argument forwarding `def self.call(...)` requires Ruby 2.7+, which is well within any supported modern Rails version. Correct.
- All other code examples (base class with `NotImplementedError`, composable queries, namespacing, `find_each` batching, `Rails.cache.fetch`, RSpec specs) are syntactically valid and use current, non-deprecated APIs.
