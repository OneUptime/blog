# How to Connect to MySQL from Ruby

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Ruby, Driver, Connection, Database

Description: Learn how to connect to a MySQL database from Ruby using the mysql2 gem and ActiveRecord, with practical query and transaction examples.

---

## Overview

Ruby's primary MySQL driver is the `mysql2` gem, which wraps the native libmysqlclient library for performance. Rails applications use `mysql2` through ActiveRecord; Sinatra and other frameworks use it directly.

## Installation

Install the gem and its native dependencies:

```bash
# Install system dependency (Ubuntu/Debian)
sudo apt-get install libmysqlclient-dev

# Install the gem
gem install mysql2
# or add to Gemfile:
# gem 'mysql2', '~> 0.5'
bundle install
```

## Basic Connection

```ruby
require 'mysql2'

client = Mysql2::Client.new(
  host:      'localhost',
  port:      3306,
  username:  'app_user',
  password:  'secret',
  database:  'shop',
  encoding:  'utf8mb4',
  collation: 'utf8mb4_unicode_ci'
)

puts "Connected to MySQL #{client.server_info[:version]}"
```

## Running Queries

```ruby
# Simple query - returns an enumerable of hashes
results = client.query("SELECT id, name, price FROM products WHERE price < 50")

results.each do |row|
  puts "#{row['name']}: $#{row['price']}"
end
```

## Parameterized Queries

The `mysql2` gem supports prepared statements, which safely bind parameters and prevent SQL injection:

```ruby
statement = client.prepare("SELECT id FROM users WHERE email = ?")
row = statement.execute(params[:email]).first
```

Alternatively, you can escape values manually with `client.escape`:

```ruby
email = client.escape(params[:email])
row = client.query("SELECT id FROM users WHERE email = '#{email}'").first
```

For Rails applications, use ActiveRecord's parameterized query interface instead.

## Using with ActiveRecord (Rails)

In a Rails application, configure `config/database.yml`:

```yaml
default: &default
  adapter: mysql2
  encoding: utf8mb4
  collation: utf8mb4_unicode_ci
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  username: <%= ENV['DB_USER'] %>
  password: <%= ENV['DB_PASSWORD'] %>
  host:     <%= ENV['DB_HOST'] %>

development:
  <<: *default
  database: shop_development
```

ActiveRecord then manages the connection pool and provides parameterized queries automatically:

```ruby
# Parameterized query via ActiveRecord
Product.where("price < ?", 50).each { |p| puts p.name }
```

## Inserting Data

```ruby
name  = client.escape("Widget Pro")
price = 29.99
client.query("INSERT INTO products (name, price) VALUES ('#{name}', #{price})")
puts "Inserted ID: #{client.last_id}"
```

## Closing the Connection

```ruby
client.close
```

## Using Environment Variables

```ruby
client = Mysql2::Client.new(
  host:     ENV['DB_HOST'],
  username: ENV['DB_USER'],
  password: ENV['DB_PASSWORD'],
  database: ENV['DB_NAME'],
  encoding: 'utf8mb4'
)
```

## Summary

The `mysql2` gem is the standard MySQL driver for Ruby and the backend for Rails' MySQL adapter. Set `encoding: 'utf8mb4'` on every connection, always escape user input with `client.escape()` or use ActiveRecord's parameterized queries, and load credentials from environment variables. For Rails projects, configure `database.yml` with the mysql2 adapter and ActiveRecord handles pooling automatically.
