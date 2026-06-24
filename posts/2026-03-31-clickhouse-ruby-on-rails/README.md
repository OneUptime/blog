# How to Use ClickHouse with Ruby on Rails

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Ruby, Rails, Database, Analytics, ActiveRecord

Description: Add ClickHouse to a Ruby on Rails application using the clickhouse-activerecord gem for ORM support and clickhouse-client for raw analytical queries.

---

Ruby on Rails applications can integrate ClickHouse either through an ActiveRecord adapter or through a raw HTTP client. The `clickhouse-activerecord` gem provides Rails-style model support with migrations, while the ClickHouse HTTP API accessed via `Net::HTTP` gives direct query access for complex analytics. This guide covers both approaches with practical examples.

## Gem Installation

Add to your Gemfile:

```ruby
# Gemfile
gem 'clickhouse-activerecord', '~> 1.0'
```

Then install:

```bash
bundle install
```

## Database Configuration

```yaml
# config/database.yml

default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>

development:
  primary:
    <<: *default
    database: myapp_development
  clickhouse:
    adapter: clickhouse
    host: <%= ENV.fetch("CLICKHOUSE_HOST", "localhost") %>
    port: <%= ENV.fetch("CLICKHOUSE_PORT", "8123") %>
    database: <%= ENV.fetch("CLICKHOUSE_DATABASE", "analytics") %>
    username: <%= ENV.fetch("CLICKHOUSE_USER", "default") %>
    password: <%= ENV.fetch("CLICKHOUSE_PASSWORD", "") %>
    ssl: <%= ENV.fetch("CLICKHOUSE_SSL", "false") == "true" %>
    debug: false
    pool: 10
```

## Database Router

You can create a helper class to identify which models use ClickHouse, useful for conditional logic elsewhere in your application:

```ruby
# config/initializers/clickhouse_router.rb

class ClickhouseRouter
  CLICKHOUSE_MODELS = %w[Event PageView SessionStat].freeze

  def connects_to_database(model, action)
    CLICKHOUSE_MODELS.include?(model.name) ? :clickhouse : :primary
  end

  def self.clickhouse_model?(model)
    CLICKHOUSE_MODELS.include?(model.name)
  end
end
```

## Migration for ClickHouse

Create a migration targeting the ClickHouse connection:

```bash
rails g clickhouse_migration CreateClickhouseEvents
```

```ruby
# db/migrate_clickhouse/20260331000001_create_clickhouse_events.rb

class CreateClickhouseEvents < ActiveRecord::Migration[7.1]
  def up
    execute <<-SQL
      CREATE TABLE IF NOT EXISTS analytics.events
      (
          event_id   UUID        DEFAULT generateUUIDv4(),
          user_id    UInt64,
          session_id String,
          event_type LowCardinality(String),
          page       String,
          properties String      DEFAULT '{}',
          ts         DateTime64(3)
      )
      ENGINE = MergeTree()
      PARTITION BY toYYYYMM(ts)
      ORDER BY (event_type, user_id, ts)
    SQL
  end

  def down
    execute "DROP TABLE IF EXISTS analytics.events"
  end
end
```

Run the migration against the ClickHouse database:

```bash
rake clickhouse:migrate
```

## ActiveRecord Model

```ruby
# app/models/event.rb

class Event < ApplicationRecord
  connects_to database: { writing: :clickhouse, reading: :clickhouse }

  self.table_name = "analytics.events"

  # Scopes
  scope :recent,        -> { order(ts: :desc) }
  scope :since,         ->(time) { where("ts >= ?", time) }
  scope :for_user,      ->(uid)  { where(user_id: uid) }
  scope :for_type,      ->(type) { where(event_type: type) }

  # Validations
  validates :user_id,    presence: true, numericality: { only_integer: true }
  validates :event_type, presence: true, length: { maximum: 64 }
  validates :page,       presence: true

  def self.summary(days: 7)
    since(days.days.ago)
      .select("event_type, count() AS total, uniq(user_id) AS unique_users")
      .group(:event_type)
      .order("total DESC")
  end

  def self.timeseries(event_type:, hours: 24)
    where(
      "event_type = ? AND ts >= ?",
      event_type,
      hours.hours.ago
    )
    .select("toStartOfHour(ts) AS bucket, count() AS count")
    .group("bucket")
    .order("bucket ASC")
  end

  def self.top_pages(days: 7, limit: 10)
    for_type("page_view")
      .since(days.days.ago)
      .select("page, count() AS views, uniq(user_id) AS unique_users")
      .group(:page)
      .order("views DESC")
      .limit(limit)
  end
end
```

## Direct HTTP Client for Complex Queries

For queries that are hard to express with ActiveRecord, use the HTTP API directly:

```ruby
# app/services/clickhouse_client.rb

require 'net/http'
require 'json'
require 'uri'

class ClickhouseClient
  def initialize
    @host     = ENV.fetch("CLICKHOUSE_HOST", "localhost")
    @port     = ENV.fetch("CLICKHOUSE_PORT", "8123").to_i
    @database = ENV.fetch("CLICKHOUSE_DATABASE", "analytics")
    @username = ENV.fetch("CLICKHOUSE_USER", "default")
    @password = ENV.fetch("CLICKHOUSE_PASSWORD", "")
  end

  def query(sql)
    uri = URI("http://#{@host}:#{@port}/")
    uri.query = URI.encode_www_form(
      database: @database,
      user:     @username,
      password: @password,
      query:    sql + " FORMAT JSON",
    )

    response = Net::HTTP.get_response(uri)
    raise "ClickHouse error: #{response.body}" unless response.is_a?(Net::HTTPSuccess)

    JSON.parse(response.body)
  end

  def insert(table, columns, rows)
    csv_body = rows.map { |row| row.join("\t") }.join("\n")
    uri = URI("http://#{@host}:#{@port}/")

    params = {
      database: @database,
      user:     @username,
      password: @password,
      query:    "INSERT INTO #{table} (#{columns.join(',')}) FORMAT TabSeparated",
    }
    uri.query = URI.encode_www_form(params)

    http      = Net::HTTP.new(uri.host, uri.port)
    request   = Net::HTTP::Post.new(uri.request_uri)
    request.body = csv_body
    response  = http.request(request)

    raise "ClickHouse insert error: #{response.body}" unless response.is_a?(Net::HTTPSuccess)
    true
  end
end
```

## Analytics Service

```ruby
# app/services/analytics_service.rb

class AnalyticsService
  def initialize
    @client = ClickhouseClient.new
  end

  def retention_cohorts
    result = @client.query(<<~SQL)
      SELECT
        cohort_week,
        week_number,
        count(DISTINCT user_id) AS retained
      FROM (
        SELECT
          e.user_id,
          c.cohort_week,
          dateDiff('week', c.cohort_week, toStartOfWeek(e.ts)) AS week_number
        FROM analytics.events AS e
        INNER JOIN (
          SELECT user_id, toStartOfWeek(min(ts)) AS cohort_week
          FROM analytics.events
          GROUP BY user_id
        ) AS c ON e.user_id = c.user_id
        WHERE e.ts >= today() - 90
      )
      GROUP BY cohort_week, week_number
      ORDER BY cohort_week, week_number
    SQL

    result["data"]
  end

  def funnel(steps:)
    conditions = steps.map.with_index do |step, i|
      "countIf(event_type = '#{step}') > 0 AS step_#{i}"
    end.join(", ")

    result = @client.query(<<~SQL)
      SELECT
        #{steps.map.with_index { |s, i| "countIf(step_#{i}) AS #{s.underscore.parameterize(separator: '_')}" }.join(', ')}
      FROM (
        SELECT
          user_id,
          #{conditions}
        FROM analytics.events
        WHERE ts >= now() - INTERVAL 30 DAY
        GROUP BY user_id
      )
    SQL

    result["data"].first
  end

  def daily_active_users(days: 30)
    result = @client.query(<<~SQL)
      SELECT
        toDate(ts)    AS day,
        uniq(user_id) AS dau
      FROM analytics.events
      WHERE ts >= today() - #{days}
      GROUP BY day
      ORDER BY day
    SQL

    result["data"]
  end
end
```

## Controller

```ruby
# app/controllers/analytics_controller.rb

class AnalyticsController < ApplicationController
  before_action :authenticate_user!

  def summary
    days   = params.fetch(:days, 7).to_i
    events = Event.summary(days: days)
    render json: events
  end

  def timeseries
    result = Event.timeseries(
      event_type: params.fetch(:event_type, "page_view"),
      hours:      params.fetch(:hours, 24).to_i,
    )
    render json: result
  end

  def top_pages
    pages = Event.top_pages(
      days:  params.fetch(:days, 7).to_i,
      limit: [params.fetch(:limit, 10).to_i, 100].min,
    )
    render json: pages
  end

  def retention
    service = AnalyticsService.new
    render json: service.retention_cohorts
  end

  def funnel
    steps  = params.require(:steps)
    service = AnalyticsService.new
    render json: service.funnel(steps: steps)
  end

  def dau
    service = AnalyticsService.new
    render json: service.daily_active_users(days: params.fetch(:days, 30).to_i)
  end
end
```

## Routes

```ruby
# config/routes.rb

Rails.application.routes.draw do
  scope '/analytics' do
    get :summary,    to: 'analytics#summary'
    get :timeseries, to: 'analytics#timeseries'
    get :top_pages,  to: 'analytics#top_pages'
    get :retention,  to: 'analytics#retention'
    get :funnel,     to: 'analytics#funnel'
    get :dau,        to: 'analytics#dau'
  end
end
```

## Background Job for Batch Inserts

Use ActiveJob to write events asynchronously and avoid blocking web requests:

```ruby
# app/jobs/track_event_job.rb

class TrackEventJob < ApplicationJob
  queue_as :analytics

  def perform(user_id:, event_type:, page:, session_id: "", properties: {})
    Event.create!(
      user_id:    user_id,
      session_id: session_id,
      event_type: event_type,
      page:       page,
      properties: properties.to_json,
      ts:         Time.current,
    )
  end
end
```

Dispatch from anywhere in your app:

```ruby
TrackEventJob.perform_later(
  user_id:    current_user.id,
  event_type: "page_view",
  page:       request.path,
  session_id: session.id.to_s,
)
```

## Summary

Ruby on Rails integrates with ClickHouse through `clickhouse-activerecord` for ORM-style access and a direct HTTP client for complex analytics. Define your ClickHouse models with `connects_to` pointing to the ClickHouse adapter, run migrations with `rake clickhouse:migrate`, and use scopes and class methods to encapsulate analytical queries. For production, dispatch event inserts through background jobs to keep your request cycle fast.
