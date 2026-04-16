# How to Use ClickHouse with Ruby

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Ruby, Integration, Database

Description: Connect Ruby applications to ClickHouse using the clickhouse-activerecord gem and the HTTP interface to run queries and insert data.

---

## Overview

ClickHouse can be used from Ruby through the HTTP interface or via dedicated gems. The most popular options are `clickhouse-activerecord` for Rails applications and the `clickhouse` gem for plain Ruby.

## Installation

Add to your Gemfile:

```ruby
# For Rails with ActiveRecord support
gem 'clickhouse-activerecord'

# For plain Ruby HTTP client
gem 'faraday'
```

Install:

```bash
bundle install
```

## Option 1 - Plain Ruby HTTP Client

```ruby
require 'faraday'
require 'json'
require 'base64'

class ClickHouseClient
  BASE_URL = 'http://localhost:8123'.freeze

  def initialize(host: 'localhost', port: 8123, user: 'default', password: '')
    @conn = Faraday.new(url: "http://#{host}:#{port}") do |f|
      f.request :url_encoded
      f.adapter Faraday.default_adapter
    end
    @user = user
    @password = password
  end

  def auth_header
    "Basic #{Base64.strict_encode64("#{@user}:#{@password}")}"
  end

  def query(sql)
    response = @conn.get('/', { query: "#{sql} FORMAT JSONEachRow" }) do |req|
      req.headers['Authorization'] = auth_header
    end

    raise "ClickHouse error: #{response.body}" unless response.status == 200

    response.body.split("\n").reject(&:empty?).map { |line| JSON.parse(line) }
  end

  def insert(table, rows)
    body = rows.map { |row| row.to_json }.join("\n")
    response = @conn.post do |req|
      req.url '/', { query: "INSERT INTO #{table} FORMAT JSONEachRow" }
      req.body = body
      req.headers['Content-Type'] = 'application/octet-stream'
      req.headers['Authorization'] = auth_header
    end

    raise "ClickHouse insert error: #{response.body}" unless response.status == 200
  end
end

# Usage
client = ClickHouseClient.new(host: 'localhost', port: 8123)

rows = client.query('SELECT user_id, count() AS cnt FROM events GROUP BY user_id LIMIT 10')
rows.each { |row| puts "#{row['user_id']}: #{row['cnt']}" }
```

## Option 2 - Using clickhouse-activerecord

Configure `config/database.yml` for a Rails app:

```yaml
development:
  primary:
    adapter: postgresql
    database: myapp_development

  clickhouse:
    adapter: clickhouse
    database: myapp_analytics
    host: localhost
    port: 8123
    username: default
    password: ""
    ssl: false
```

Define a model connected to ClickHouse:

```ruby
# app/models/event.rb
class Event < ActiveRecord::Base
  connects_to database: { writing: :clickhouse, reading: :clickhouse }

  self.table_name = 'events'
end
```

## Creating a ClickHouse Table via Migration

```ruby
# db/migrate/20240115000000_create_events_clickhouse.rb
class CreateEventsClickhouse < ActiveRecord::Migration[7.0]
  def up
    create_table :events, id: false, options: 'MergeTree() PARTITION BY toYYYYMM(event_date) ORDER BY (event_date, user_id)' do |t|
      t.date :event_date, null: false
      t.datetime :event_time, null: false
      t.bigint :user_id, null: false
      t.string :event_type, null: false
      t.string :properties, default: '{}'
    end
  end

  def down
    drop_table :events
  end
end
```

Run the migration:

```bash
rails db:migrate:clickhouse
```

## Querying with ActiveRecord

```ruby
# Count events by type
Event.group(:event_type).count

# Find events for a user
Event.where(user_id: 1001, event_date: 7.days.ago..Date.today)
     .order(event_time: :desc)
     .limit(50)

# Aggregate query
Event
  .select("toStartOfHour(event_time) AS hour, count() AS cnt")
  .where("event_date >= ?", 30.days.ago)
  .group("hour")
  .order("hour DESC")
  .map { |r| { hour: r.hour, count: r.cnt } }
```

## Inserting Data

```ruby
# Single insert
Event.create!(
  event_date: Date.today,
  event_time: Time.current,
  user_id: 1001,
  event_type: 'page_view',
  properties: { url: '/home' }.to_json
)

# Bulk insert
events = (1..1000).map do |i|
  {
    event_date: Date.today,
    event_time: Time.current,
    user_id: rand(1..10_000),
    event_type: %w[page_view click purchase].sample,
    properties: '{}'
  }
end

Event.insert_all(events)
```

## Raw SQL Queries

```ruby
# Execute raw SQL
result = ActiveRecord::Base.connection_pool.with_connection do |conn|
  conn.execute("SELECT version()")
end

# Using the clickhouse connection directly
Event.connection.execute(<<~SQL)
  INSERT INTO events
  SELECT
    today() AS event_date,
    now() AS event_time,
    user_id,
    'migrated' AS event_type,
    '{}' AS properties
  FROM legacy_events
  WHERE migrated = 0
SQL
```

## Summary

Ruby connects to ClickHouse either via a plain HTTP client using Faraday or through the `clickhouse-activerecord` gem for Rails applications. The ActiveRecord adapter provides familiar migration, query, and insert interfaces. For high-throughput inserts, use `insert_all` with batches of thousands of rows. Always keep batch inserts large (1000+ rows) to avoid ClickHouse write amplification from many small inserts.
