# How to Use MongoDB with Rails 7 and Mongoid

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Rails, Mongoid

Description: Integrate MongoDB into Rails 7 using the Mongoid ODM, with model definitions, associations, scopes, and migration-free schema management.

---

## Why Mongoid for Rails

Mongoid is the official MongoDB ODM for Ruby, designed to feel like ActiveRecord while embracing MongoDB's document model. It supports embedded documents, polymorphic associations, scopes, and validations. Unlike ActiveRecord, Mongoid requires no migrations - schema changes are applied by simply updating the model definition.

## Setup

Add to your `Gemfile`:

```ruby
gem 'mongoid', '~> 8.0'
```

Remove or comment out `gem 'activerecord'` and `gem 'sqlite3'` (or your SQL gem).

```bash
bundle install
rails g mongoid:config
```

## Configuration

`config/mongoid.yml`:

```yaml
development:
  clients:
    default:
      uri: <%= ENV['MONGODB_URI'] || 'mongodb://localhost:27017/myapp_development' %>
      options:
        max_pool_size: 10
        min_pool_size: 2
        server_selection_timeout: 5
        wait_queue_timeout: 5

production:
  clients:
    default:
      uri: <%= ENV['MONGODB_URI'] %>
      options:
        max_pool_size: 20
        ssl: true
```

## Defining a Mongoid Model

```ruby
# app/models/article.rb
class Article
  include Mongoid::Document
  include Mongoid::Timestamps

  field :title,        type: String
  field :slug,         type: String
  field :body,         type: String
  field :status,       type: String, default: 'draft'
  field :view_count,   type: Integer, default: 0
  field :published_at, type: Time

  belongs_to :author, class_name: 'User'
  embeds_many :comments

  index({ slug: 1 }, { unique: true })
  index({ status: 1, published_at: -1 })

  validates :title, presence: true, length: { maximum: 200 }
  validates :slug, uniqueness: true

  scope :published, -> { where(status: 'published').lte(published_at: Time.current) }
  scope :recent,    -> { order(published_at: :desc) }
end
```

## Embedded Document

```ruby
# app/models/comment.rb
class Comment
  include Mongoid::Document
  include Mongoid::Timestamps

  embedded_in :article

  field :body,       type: String
  field :author_name, type: String

  validates :body, presence: true
end
```

## Controller

```ruby
# app/controllers/articles_controller.rb
class ArticlesController < ApplicationController
  def index
    @articles = Article.published.recent.limit(20).only(:title, :slug, :published_at)
  end

  def show
    @article = Article.find_by(slug: params[:slug])
    @article.inc(view_count: 1)
  end

  def create
    @article = Article.new(article_params)
    @article.author = current_user
    if @article.save
      render json: @article, status: :created
    else
      render json: @article.errors, status: :unprocessable_entity
    end
  end

  private

  def article_params
    params.require(:article).permit(:title, :slug, :body, :status)
  end
end
```

## Creating Indexes

```bash
# Create all defined indexes
rails db:mongoid:create_indexes

# Remove indexes that exist in the database but are not defined in models
rails db:mongoid:remove_undefined_indexes
```

## Summary

Mongoid brings the Rails conventions to MongoDB development. Define models with `include Mongoid::Document`, declare fields and types explicitly, use `embeds_many` for embedded documents instead of join tables, and define indexes directly on the model class. The migration-free workflow means schema changes are instant, and Mongoid's scopes and query API keep your controllers and services clean and idiomatic.
