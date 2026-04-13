# How to Use Mongoid ODM with MongoDB and Ruby on Rails

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongoid, Rails, ODM, Ruby

Description: A step-by-step guide to integrating Mongoid ODM into a Ruby on Rails application for ActiveRecord-like MongoDB document modeling.

---

## Introduction

Mongoid is the official Ruby ODM (Object Document Mapper) for MongoDB. It integrates deeply with Rails, providing an API that mirrors ActiveRecord - including callbacks, validations, associations, and scopes - while persisting data to MongoDB documents.

## Installation

```ruby
# Gemfile
gem 'mongoid', '~> 9.0'
```

```bash
bundle install
rails g mongoid:config
```

This generates `config/mongoid.yml`.

## Configuring mongoid.yml

```yaml
development:
  clients:
    default:
      uri: <%= ENV['MONGODB_URI'] || 'mongodb://localhost:27017/myapp_development' %>
      options:
        server_selection_timeout: 5
        max_pool_size: 10

production:
  clients:
    default:
      uri: <%= ENV['MONGODB_URI'] %>
      options:
        ssl: true
        max_pool_size: 20
```

## Defining a Model

```ruby
class Article
  include Mongoid::Document
  include Mongoid::Timestamps

  field :title,      type: String
  field :body,       type: String
  field :published,  type: Boolean, default: false
  field :view_count, type: Integer, default: 0
  field :tags,       type: Array

  validates :title, presence: true, length: { maximum: 200 }

  index({ title: 1 }, { unique: true })
  index({ tags: 1 })
end
```

## CRUD with Mongoid

```ruby
# Create
article = Article.create!(
  title: 'Getting Started with Mongoid',
  tags:  ['mongodb', 'rails']
)

# Read
Article.where(published: true).order_by(created_at: :desc).limit(10)
Article.find(article.id)

# Update
article.update!(view_count: article.view_count + 1)
Article.where(published: false).update_all(published: true)

# Delete
article.destroy
Article.where(published: false).destroy_all
```

## Scopes

```ruby
class Article
  include Mongoid::Document

  scope :published,  -> { where(published: true) }
  scope :recent,     -> { order_by(created_at: :desc).limit(5) }
  scope :tagged_with, ->(tag) { where(tags: tag) }
end

# Usage
Article.published.tagged_with('rails').recent
```

## Associations

```ruby
class User
  include Mongoid::Document
  has_many :articles, dependent: :destroy
end

class Article
  include Mongoid::Document
  belongs_to :user
  embeds_many :comments
end

class Comment
  include Mongoid::Document
  field :body, type: String
  embedded_in :article
end
```

## Summary

Mongoid brings ActiveRecord-like productivity to MongoDB in Rails. You define document models with fields and validations, use familiar scopes and associations, and write queries with a chainable DSL. Embedded documents let you co-locate related data in a single MongoDB document for fast reads without joins.
