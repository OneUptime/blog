# Validation Summary: How to Trace ActiveRecord Database Queries with OpenTelemetry in Rails

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Ruby SDK
- OpenTelemetry Ruby ActiveRecord instrumentation
- OpenTelemetry Ruby ActiveSupport instrumentation
- Ruby on Rails
- ActiveRecord
- ActiveSupport::Notifications
- SQL tracing and database semantic conventions

## Sources Consulted
- OpenTelemetry Ruby documentation: https://opentelemetry.io/docs/languages/ruby/
- OpenTelemetry Ruby SDK configurator source: https://github.com/open-telemetry/opentelemetry-ruby/blob/main/sdk/lib/opentelemetry/sdk/configurator.rb
- OpenTelemetry Ruby ActiveRecord instrumentation README and source: https://github.com/open-telemetry/opentelemetry-ruby-contrib/tree/main/instrumentation/active_record
- OpenTelemetry Ruby ActiveSupport instrumentation README and source: https://github.com/open-telemetry/opentelemetry-ruby-contrib/tree/main/instrumentation/active_support
- RubyGems page for `opentelemetry-instrumentation-active_record` 0.13.0: https://rubygems.org/gems/opentelemetry-instrumentation-active_record/versions/0.13.0
- Rails Active Support Instrumentation guide: https://guides.rubyonrails.org/active_support_instrumentation.html
- Rails `ActiveRecord::ConnectionAdapters::ConnectionPool` API: https://api.rubyonrails.org/classes/ActiveRecord/ConnectionAdapters/ConnectionPool.html
- OpenTelemetry database span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-metrics/

## Issues Found
- The post claimed `opentelemetry-instrumentation-active_record` hooks into `ActiveSupport::Notifications` and automatically captures SQL statements, connection details, and table names. Current OpenTelemetry Ruby ActiveRecord instrumentation patches ActiveRecord model methods; SQL notification tracing requires `opentelemetry-instrumentation-active_support` and an explicit subscription to `sql.active_record`. Updated the explanation, installation, and configuration examples.
- The configuration examples used unsupported options: `enable_sql_obfuscation`, `db_statement`, and `enable_connection_pool_metrics`. Replaced them with a documented ActiveSupport subscriber and a payload transform that emits SQL attributes.
- The post used deprecated database semantic attributes such as `db.statement`, `db.operation`, and `db.sql.table`. Replaced them with current attributes such as `db.query.text`, `db.operation.name`, `db.system.name`, and `db.namespace`.
- The connection pool example called non-public or unavailable methods such as `available_connection_count` and `num_waiting_in_queue`. Replaced them with the documented `ActiveRecord::Base.connection_pool.stat` hash.
- The custom span processor filtered `db.statement`; updated it to filter `db.query.text` and handle nil attributes safely.
- The test examples looked for spans named after SQL verbs and checked old attributes. Updated them to match the configured `active_record.sql` span name and current attribute keys.

## Review Notes
- The SQL sanitizer is intentionally simple and suitable for the article's example, but production systems should prefer a proven SQL parser/sanitizer or Collector-side redaction for defense in depth.
- Current `opentelemetry-instrumentation-active_record` releases have modern Ruby and ActiveRecord version requirements; older Rails applications may need an older compatible gem version.
