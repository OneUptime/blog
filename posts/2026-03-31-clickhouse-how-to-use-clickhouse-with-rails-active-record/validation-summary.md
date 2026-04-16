# Validation Summary: How to Use ClickHouse with Rails (Active Record)

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- ClickHouse
- Ruby on Rails (7.1+)
- Active Record
- `clickhouse-activerecord` gem (https://github.com/PNixx/clickhouse-activerecord)
- Ruby
- YAML (database.yml)

## Sources Consulted
- clickhouse-activerecord gem README: https://github.com/PNixx/clickhouse-activerecord
- RubyGems entry: https://rubygems.org/gems/clickhouse-activerecord
- Rails multi-database documentation: https://guides.rubyonrails.org/active_record_multiple_databases.html
- ClickHouse HTTP interface docs (default port 8123): https://clickhouse.com/docs/en/interfaces/http

## Issues Found

1. **Incorrect migration command.** The post originally used `rails db:migrate DATABASE=clickhouse`, which is not valid Rails syntax. In Rails 6+ multi-database setups (and as documented by the gem), the correct command is `rails db:migrate:clickhouse`, following the `db:migrate:<database_name>` convention. Fixed.

2. **Contradictory model definition.** The post originally defined `PageView` with `self.abstract_class = true` and then used `PageView.create!(...)` directly on it in later examples. Abstract classes cannot be instantiated — calling `create!` on them raises `NotImplementedError`. Fixed by introducing an abstract `ClickhouseRecord` base class holding the `connects_to` call, with `PageView` as a concrete subclass. This is the idiomatic Rails multi-DB pattern and matches the gem's intended usage.

## Review Notes

- The gem's current version (1.6.7, released 2026-03-05) requires `activerecord >= 7.1, < 9.0`, so the `ActiveRecord::Migration[7.1]` class used in the example is appropriate.
- The `options: 'ENGINE = MergeTree() ORDER BY (...)'` syntax is accepted; the gem's own README uses a slightly shorter form (`options: "MergeTree ORDER BY ..."`) but both work.
- The `database.yml` snippet is shown at the top level. In a real multi-db Rails project it is typically nested under an environment key (`development:` etc.), but the top-level example is still readable as a config reference and is not technically incorrect in isolation.
- `uniq()` is indeed a ClickHouse-specific aggregation function — the recommendation to drop to raw SQL for it is reasonable, though Active Record's `select` would also accept it as a string expression.
