# How to Use ClickHouse with Rails (Active Record)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Rails, Active Record, Ruby, Analytics, Database

Description: Integrate ClickHouse into a Ruby on Rails application using the clickhouse-activerecord gem to define models and run analytical queries.

---

Ruby on Rails uses Active Record as its ORM. The `clickhouse-activerecord` gem extends this to support ClickHouse, allowing you to define models backed by ClickHouse tables and use familiar Rails query syntax for analytics.

## Installing the Gem

Add to your `Gemfile`:

```text
gem 'clickhouse-activerecord', '~> 1.0'
```

Then run:

```bash
bundle install
```

## Configuring the ClickHouse Adapter

In `config/database.yml`, add a ClickHouse connection:

```text
default: &default
  adapter: sqlite3

development:
  <<: *default
  database: db/development.sqlite3

clickhouse:
  adapter: clickhouse
  host: localhost
  port: 8123
  database: default
  username: default
  password:
  debug: false
```

## Creating a Migration

Generate and run a migration to create a ClickHouse table:

```bash
rails generate migration CreatePageViews
```

Edit the migration:

```ruby
class CreatePageViews < ActiveRecord::Migration[7.1]
  def up
    create_table :page_views, id: false, options: 'ENGINE = MergeTree() ORDER BY (created_at, page)' do |t|
      t.string :page, null: false
      t.string :user_id, null: false
      t.integer :duration_ms, default: 0
      t.datetime :created_at, null: false
    end
  end

  def down
    drop_table :page_views
  end
end
```

Run it against the ClickHouse connection:

```bash
rails db:migrate:clickhouse
```

## Defining the Model

Create an abstract base class that connects to ClickHouse, then inherit concrete models from it:

```ruby
class ClickhouseRecord < ApplicationRecord
  self.abstract_class = true
  connects_to database: { writing: :clickhouse, reading: :clickhouse }
end

class PageView < ClickhouseRecord
end
```

## Inserting Records

```ruby
PageView.create!(
  page: '/home',
  user_id: 'user_123',
  duration_ms: 340,
  created_at: Time.current
)

# Bulk insert
PageView.insert_all([
  { page: '/home', user_id: 'user_1', duration_ms: 300, created_at: Time.current },
  { page: '/about', user_id: 'user_2', duration_ms: 150, created_at: Time.current },
])
```

## Querying with Active Record

```ruby
# Top pages
PageView
  .select('page, count() AS views, avg(duration_ms) AS avg_duration')
  .where('created_at >= ?', 7.days.ago)
  .group(:page)
  .order('views DESC')
  .limit(10)

# Raw SQL for ClickHouse-specific functions
PageView.find_by_sql(<<~SQL)
  SELECT
    toDate(created_at) AS day,
    uniq(user_id) AS unique_users
  FROM page_views
  GROUP BY day
  ORDER BY day DESC
  LIMIT 30
SQL
```

## Summary

The `clickhouse-activerecord` gem makes ClickHouse feel like a first-class Rails database. Migrations, models, and query methods work as expected. For ClickHouse-specific aggregations like `uniq()` or window functions, drop down to raw SQL. This hybrid approach gives Rails developers a familiar interface with the analytical power of ClickHouse.
