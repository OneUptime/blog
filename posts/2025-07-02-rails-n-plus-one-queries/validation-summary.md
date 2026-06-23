# Validation Summary: How to Handle N+1 Queries in Rails

## Status
validated

## Post Type
Tutorial / Guide (technical, code-heavy)

## Technologies Covered
- Ruby on Rails (ActiveRecord)
- Bullet gem (N+1 detection)
- RSpec
- ActiveSupport::Notifications
- ActiveModelSerializers, Blueprinter, Jbuilder (API serialization)
- PostgreSQL (EXPLAIN ANALYZE)
- DatabaseCleaner

## Sources Consulted
- ActiveRecord eager loading guide (`includes`, `preload`, `eager_load`): https://guides.rubyonrails.org/active_record_querying.html#eager-loading-associations
- ActiveRecord `strict_loading` / `StrictLoadingViolationError` (Rails 6.1+): https://api.rubyonrails.org/classes/ActiveRecord/Relation.html and https://guides.rubyonrails.org/active_record_querying.html#strict-loading
- Counter cache (`counter_cache`, `reset_counters`, `increment_counter`/`decrement_counter`): https://api.rubyonrails.org/classes/ActiveRecord/CounterCache/ClassMethods.html
- Batch processing (`find_each`, `find_in_batches`, `start`/`finish`): https://api.rubyonrails.org/classes/ActiveRecord/Batches.html
- Bullet gem README (config options + RSpec hooks): https://github.com/flyerhzm/bullet
- Query log tags (`query_log_tags_enabled`, `query_log_tags`): https://api.rubyonrails.org/classes/ActiveRecord/QueryLogs.html
- ActiveSupport::Notifications (`subscribe`, `subscribed`, `sql.active_record`): https://api.rubyonrails.org/classes/ActiveSupport/Notifications.html

## Issues Found
No technical issues found.

All code samples were verified for correctness:
- The N+1 arithmetic (100 posts → 101 queries; 2 queries when eager loaded) is correct.
- Bullet configuration keys and the RSpec `start_request`/`end_request`/`perform_out_of_channel_notifications` flow match the gem's documented usage.
- The `includes` vs `preload` vs `eager_load` strategy descriptions are accurate, including that `includes` auto-switches to a LEFT OUTER JOIN when a hash condition references the associated table (so `where(authors: { active: true })` works without an explicit `.references`).
- The has_many :through preload diagram (tags joined through post_tags) reflects how Rails actually preloads through-associations.
- Counter cache setup, migration with `reset_counters`, and `increment_counter`/`decrement_counter` usage are correct.
- `find_each(start:, finish:, batch_size:)`, endless range `reputation: 50..`, `strict_loading` relation method, and `ActiveRecord::StrictLoadingViolationError` are all valid for the Rails versions referenced (6.1+/7.0).

## Review Notes
- Scenario 5 ("Scoped Associations") states that a scope "prevents normal includes from working" and recommends `preload`. This reflects a real and well-known Rails gotcha (the JOIN strategy used by `includes`/`eager_load` can misapply the association's scope), and the recommended fix (`preload`, which guarantees separate queries) is correct. It is a fair simplification rather than an error, so no change was made.
- The benchmark output numbers are illustrative ("Expected output") and clearly labeled as such; they correctly demonstrate the relative ordering (N+1 slowest, eager-loading variants fast). Actual numbers will vary by machine/database.
- Version-specific notes are handled well: strict loading is correctly attributed to Rails 6.1+, and migrations use `ActiveRecord::Migration[7.0]`.
- All code is current and uses non-deprecated APIs as of Rails 7.x.
