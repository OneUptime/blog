# Validation Summary: How to Use ClickHouse with Ruby

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ClickHouse
- Ruby
- Ruby on Rails (ActiveRecord)
- `clickhouse-activerecord` gem (PNixx/clickhouse-activerecord)
- Faraday HTTP client
- ClickHouse HTTP interface (port 8123, JSONEachRow format)
- MergeTree table engine

## Sources Consulted
- [PNixx/clickhouse-activerecord GitHub repository](https://github.com/PNixx/clickhouse-activerecord)
- [clickhouse-activerecord schema_creation.rb source](https://raw.githubusercontent.com/PNixx/clickhouse-activerecord/master/lib/active_record/connection_adapters/clickhouse/schema_creation.rb)
- [clickhouse-activerecord top-level lib source](https://raw.githubusercontent.com/PNixx/clickhouse-activerecord/master/lib/clickhouse-activerecord.rb)
- [Faraday Connection#basic_auth RubyDoc](https://www.rubydoc.info/gems/faraday/1.4.1/Faraday/Connection:basic_auth)
- [Faraday deprecation notice for basic_auth (lostisland/faraday#1317)](https://github.com/lostisland/faraday/issues/1317)
- [ClickHouse MergeTree docs](https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree)
- [ClickHouse HTTP interface docs](https://clickhouse.com/docs/interfaces/http)

## Issues Found

1. **Invalid Faraday API call (`Faraday::Connection.basic_auth`)**: The original HTTP client used `Faraday::Connection.basic_auth(@user, @password)` as if it returned an Authorization header string. `basic_auth` is an instance method (not a class method) on `Faraday::Connection`, it does not return a string (it sets the connection's Authorization header), and it is deprecated/removed in Faraday 2.x. Replaced with a helper method that builds the header using `Base64.strict_encode64("#{user}:#{password}")` and added the header to both the `query` GET and the `insert` POST (the original `insert` method was also missing the Authorization header entirely). Also added `require 'base64'`.

2. **Duplicated `ENGINE =` prefix in the migration `options`**: The original migration passed `options: 'ENGINE = MergeTree() ...'` to `create_table`. The clickhouse-activerecord adapter's `add_table_options!` already prepends `" ENGINE = "` to the options string when generating SQL (see `schema_creation.rb`), so the original would have produced invalid SQL (`ENGINE = ENGINE = MergeTree() ...`). Fixed by dropping the leading `ENGINE = ` so the options string is just `'MergeTree() PARTITION BY toYYYYMM(event_date) ORDER BY (event_date, user_id)'`.

3. **Non-existent `ClickhouseActiverecord::Config.setup` block**: The "Connection Configuration" section showed an initializer calling `ClickhouseActiverecord::Config.setup` with `logger`, `database_timezone`, and `app_timezone` options. No such `Config` module exists in the clickhouse-activerecord gem (the `lib/clickhouse-activerecord/` directory contains only `minitest.rb`, `railtie.rb`, `rspec.rb`, `schema.rb`, `schema_dumper.rb`, `tasks.rb`, and `version.rb`; the top-level module has no such API). Removed the section rather than fabricating a replacement, since all necessary configuration is already covered by `database.yml`.

## Review Notes
- The `clickhouse-activerecord` gem requires Rails >= 7.1 per the gem README; the migration example uses `ActiveRecord::Migration[7.0]` which is fine with Rails 7.1+ but readers on older Rails would need an older gem version.
- `rails db:migrate:clickhouse` is the correct task name when using multiple databases; for single-database setups, plain `rails db:migrate` also works.
- The `connects_to database: { writing: :clickhouse, reading: :clickhouse }` pattern is the Rails 6+ multi-DB syntax and pairs correctly with the `database.yml` layout shown.
- For production use, readers should consider connection pooling, TLS (port 8443), and retry/backoff — out of scope for an introductory post.
