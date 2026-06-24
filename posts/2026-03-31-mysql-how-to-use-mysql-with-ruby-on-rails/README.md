# How to Use MySQL with Ruby on Rails

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Ruby On Rail, ActiveRecord, Database Configuration, Web Development

Description: Learn how to set up MySQL with Ruby on Rails, configure database.yml, manage schema migrations, and use ActiveRecord with MySQL-specific features.

---

## Prerequisites

You need Ruby 3.x, Rails 7.x, and a running MySQL 8.0+ instance. You also need the `mysql2` gem, which is the standard MySQL adapter for Rails.

## Creating a New Rails App with MySQL

```bash
# Create a new Rails app with MySQL as the database
rails new myapp --database=mysql

cd myapp
```

This generates a `database.yml` already configured for MySQL and adds `mysql2` to the Gemfile.

## Installing the mysql2 Gem

If adding MySQL to an existing project:

```bash
# Add to Gemfile
# gem 'mysql2', '~> 0.5'

bundle install
```

On macOS with Homebrew:

```bash
brew install mysql-client
bundle config set build.mysql2 "--with-mysql-config=$(brew --prefix mysql-client)/bin/mysql_config"
bundle install
```

## Configuring database.yml

```yaml
default: &default
  adapter: mysql2
  encoding: utf8mb4
  collation: utf8mb4_unicode_ci
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  username: <%= ENV['DB_USER'] %>
  password: <%= ENV['DB_PASSWORD'] %>
  host: <%= ENV.fetch('DB_HOST') { '127.0.0.1' } %>
  port: 3306
  socket: /tmp/mysql.sock

development:
  <<: *default
  database: myapp_development

test:
  <<: *default
  database: myapp_test

production:
  <<: *default
  database: myapp_production
  url: <%= ENV['DATABASE_URL'] %>
```

Store credentials in environment variables or Rails credentials, not in plain text.

## Creating the Database

```sql
-- In MySQL
CREATE USER 'myapp_user'@'localhost' IDENTIFIED BY 'secretpassword';
GRANT ALL PRIVILEGES ON `myapp_%`.* TO 'myapp_user'@'localhost';
FLUSH PRIVILEGES;
```

```bash
# In Rails
rails db:create
```

## Generating and Running Migrations

```bash
# Generate a migration
rails generate migration CreateProducts name:string price:decimal stock:integer

# Run migrations
rails db:migrate

# Check migration status
rails db:migrate:status
```

Example customized migration file:

```ruby
class CreateProducts < ActiveRecord::Migration[7.0]
  def change
    create_table :products do |t|
      t.string :name, null: false, limit: 255
      t.decimal :price, precision: 10, scale: 2, null: false
      t.integer :stock, default: 0, null: false
      t.text :description

      t.timestamps
    end

    add_index :products, :name
    add_index :products, [:price, :stock]
  end
end
```

## Defining Models and Using ActiveRecord

```ruby
# app/models/product.rb
class Product < ApplicationRecord
  validates :name, presence: true, length: { maximum: 255 }
  validates :price, presence: true, numericality: { greater_than: 0 }
  validates :stock, numericality: { greater_than_or_equal_to: 0 }

  scope :available, -> { where('stock > 0') }
  scope :affordable, ->(max_price) { where('price <= ?', max_price) }

  def self.search(term)
    where('name LIKE ?', "%#{sanitize_sql_like(term)}%")
  end
end
```

## Raw SQL and MySQL-Specific Queries

```ruby
# Execute a raw query
results = ActiveRecord::Base.connection.execute(
  "SELECT id, name, price FROM products WHERE stock > 0 ORDER BY price ASC LIMIT 10"
)
results.each { |row| puts row.inspect }

# Using find_by_sql
products = Product.find_by_sql([
  "SELECT p.*, c.name AS category_name FROM products p
   JOIN categories c ON p.category_id = c.id
   WHERE p.stock > ? AND p.price < ?",
  0, 100.0
])

# Using select with expressions
Product.select("id, name, price * 1.1 AS price_with_tax").where("stock > 0")
```

## Handling Transactions

```ruby
# Atomic block - rolls back if any exception is raised
ActiveRecord::Base.transaction do
  product.update!(stock: product.stock - quantity)
  order = Order.create!(customer: current_user, product: product, quantity: quantity)
  Payment.create!(order: order, amount: product.price * quantity)
end
```

## MySQL-Specific Migration Options

```ruby
# Add fulltext index (MySQL-specific)
class AddFulltextIndexToProducts < ActiveRecord::Migration[7.0]
  def change
    add_index :products, [:name, :description], type: :fulltext
  end
end

# Use MySQL-specific options
create_table :events, options: 'ENGINE=InnoDB ROW_FORMAT=COMPRESSED' do |t|
  t.string :name
  t.timestamps
end
```

## Summary

Rails integrates with MySQL through the `mysql2` gem and ActiveRecord. Configure `database.yml` with `utf8mb4` encoding for full Unicode support, use environment variables for credentials, and manage schema changes through versioned migration files. For MySQL-specific features like fulltext indexes or table options, Rails migrations support a `type:` parameter and `options:` string directly on index and table creation methods.
