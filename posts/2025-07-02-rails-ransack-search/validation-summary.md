# Validation Summary: How to Build Multi-Model Search with Ransack in Rails

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby on Rails (ActiveRecord)
- Ransack gem (`~> 4.1`)
- Kaminari (pagination)
- Hotwire / Turbo Frames + Stimulus
- PostgreSQL (full-text index, `EXTRACT`, `to_tsvector`, gin index)
- RSpec (model and request specs)
- Arel (custom ransackers)

## Sources Consulted
- Ransack official docs — Using Predicates: https://activerecord-hackery.github.io/ransack/getting-started/using-predicates/
- Ransack official docs — Search Matchers: https://activerecord-hackery.github.io/ransack/getting-started/search-matches/
- Ransack Constants (predicate definitions), RubyDoc for ransack 4.1.1: https://www.rubydoc.info/gems/ransack/Ransack/Constants
- Ransack Wiki — Basic Searching: https://github.com/activerecord-hackery/ransack/wiki/Basic-Searching

## Issues Found
- **Incorrect case-insensitivity claim in a model spec.** The original test asserted that the `name_cont` predicate is case insensitive (`Product.ransack(name_cont: 'laptop')` matching `'Gaming Laptop'`). Per the Ransack documentation, `cont` generates a plain case-sensitive `LIKE`; case-insensitivity is provided by the separate `i_cont` predicate (which emits `ILIKE` on PostgreSQL). On the PostgreSQL backend this post otherwise targets (`to_tsvector`, gin index), the original test would fail. Changed the test to use `name_i_cont` and added a short comment explaining the distinction. The post's own predicate reference table and diagram already correctly distinguish `cont` (LIKE), `i_cont` (ILIKE, case-insensitive), and `matches` (LIKE, case-sensitive), so no changes were needed there.

## Review Notes
- The predicate reference table and Mermaid diagrams are accurate against current Ransack docs, including `eq`, `not_eq`, `lt/lteq/gt/gteq`, `cont/not_cont`, `start/end`, `in/not_in`, `null/not_null`, `present/blank`, and `true/false`.
- `ransackable_attributes`, `ransackable_associations`, and `ransackable_scopes` allowlisting is required in Ransack 4.x (since 4.0) and is correctly demonstrated, including the per-`auth_object` authorization pattern via `Model.ransack(params, auth_object: current_user)`.
- Custom ransackers using `Arel.sql`, `Arel::Nodes::InfixOperation`, and `type:` options are valid. Several (e.g. `EXTRACT(...)`, `CONCAT`, the `CURRENT_DATE - created_at` arithmetic, gin/`to_tsvector` index) are PostgreSQL/MySQL-specific; this is consistent with the post's PostgreSQL focus but worth noting for SQLite users.
- `distinct: true` when searching `has_many` associations, eager loading via `includes`/`references`, and `search_form_for`/`sort_link` helper usage all match Ransack's documented APIs.
- Gem version `~> 4.1` is current and compatible with modern Rails (Rails 6.1.5+). Migration class uses `ActiveRecord::Migration[7.1]`, consistent with a Rails 7.1 app.
