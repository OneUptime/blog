# How to Use MySQL with Rails Active Record

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Rails, Active Record, Ruby, ORM

Description: Learn how to configure Ruby on Rails to use MySQL with Active Record, define models, run migrations, and write efficient queries against a MySQL database.

---

## Introduction

Ruby on Rails uses Active Record as its default ORM, and MySQL is one of its most popular database backends. Rails handles migrations, associations, and query generation through Active Record, letting you work with MySQL data using idiomatic Ruby.

## Adding the mysql2 Gem

```ruby
# Gemfile
gem 'mysql2', '~> 0.5'
```

```bash
bundle install
```

## Configuring database.yml

```yaml
default: &default
  adapter: mysql2
  encoding: utf8mb4
  collation: utf8mb4_unicode_ci
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  username: rails_user
  password: <%= ENV['DB_PASSWORD'] %>
  host: localhost
  port: 3306

development:
  <<: *default
  database: myapp_development

production:
  <<: *default
  database: myapp_production
```

## Creating the Database and User

```sql
CREATE USER 'rails_user'@'localhost' IDENTIFIED BY 'password';
CREATE DATABASE myapp_development CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON myapp_development.* TO 'rails_user'@'localhost';
FLUSH PRIVILEGES;
```

```bash
rails db:create
```

## Generating a Migration

```bash
rails generate migration CreateProducts name:string price:decimal stock:integer category:references
```

The generated migration:

```ruby
class CreateProducts < ActiveRecord::Migration[7.1]
  def change
    create_table :products do |t|
      t.string :name, null: false, limit: 200
      t.decimal :price, precision: 10, scale: 2
      t.integer :stock, default: 0
      t.references :category, null: false, foreign_key: true
      t.timestamps
    end
    add_index :products, [:category_id, :price]
  end
end
```

```bash
rails db:migrate
```

## Defining Model Associations

```ruby
class Category < ApplicationRecord
  has_many :products, dependent: :destroy
  validates :name, presence: true, uniqueness: true
end

class Product < ApplicationRecord
  belongs_to :category
  validates :name, presence: true
  validates :price, numericality: { greater_than: 0 }
  scope :in_stock, -> { where('stock > 0') }
  scope :affordable, ->(max) { where('price <= ?', max) }
end
```

## Querying with Active Record

```ruby
# Find products with associations loaded (avoids N+1)
products = Product.includes(:category)
                  .in_stock
                  .affordable(500)
                  .order(:price)

# Aggregations
electronics = Category.find_by(name: 'Electronics')
avg_price = Product.where(category: electronics).average(:price)
out_of_stock = Product.where(stock: 0).count

# Update and delete
Product.where('price > ?', 10_000).update_all(stock: 0)
Product.where(stock: 0).destroy_all
```

## Using Raw SQL

```ruby
results = ActiveRecord::Base.connection.execute(
  "SELECT category_id, SUM(stock) AS total_stock FROM products GROUP BY category_id"
)
results.each { |row| puts row.inspect }
```

## Summary

Rails Active Record with MySQL is configured via `database.yml` using the `mysql2` gem. Define models as Ruby classes with associations and validations, generate schema changes through migrations, and query data with Active Record's fluent API. Use `includes` to eager-load associations, `scope` to encapsulate reusable query logic, and raw SQL when the ORM's query builder is insufficient.
