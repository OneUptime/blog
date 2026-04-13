# How to Build a REST API with MongoDB and Rails

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Ruby On Rail, Mongoid, REST API, Ruby

Description: Learn how to build a REST API with Ruby on Rails and Mongoid ODM including model definitions, CRUD controllers, validations, and JSON responses.

---

## Project Setup

Create a new Rails API application:

```bash
gem install rails
rails new mongo-api --api --skip-active-record
cd mongo-api
```

Add Mongoid to the Gemfile:

```ruby
# Gemfile
gem 'mongoid', '~> 8.0'
```

```bash
bundle install
rails g mongoid:config
```

## Mongoid Configuration

```yaml
# config/mongoid.yml
development:
  clients:
    default:
      uri: <%= ENV.fetch('MONGODB_URI', 'mongodb://localhost:27017/myapp_development') %>
      options:
        server_selection_timeout: 5
        wait_queue_timeout: 5

production:
  clients:
    default:
      uri: <%= ENV['MONGODB_URI'] %>
      options:
        server_selection_timeout: 10
```

## Model

```ruby
# app/models/user.rb
class User
  include Mongoid::Document
  include Mongoid::Timestamps

  field :name, type: String
  field :email, type: String

  validates :name, presence: true, length: { maximum: 200 }
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :email, uniqueness: { case_sensitive: false }

  before_save :downcase_email

  index({ email: 1 }, { unique: true, background: true })

  private

  def downcase_email
    self.email = email.downcase
  end
end
```

## Controller

```ruby
# app/controllers/api/v1/users_controller.rb
module Api
  module V1
    class UsersController < ApplicationController
      before_action :set_user, only: [:show, :update, :destroy]

      # GET /api/v1/users
      def index
        page = (params[:page] || 1).to_i
        limit = params[:limit].present? ? [[params[:limit].to_i, 1].max, 100].min : 20

        users = User.all.order_by(created_at: :desc).page(page).per(limit)
        total = User.count

        render json: {
          data: users.as_json(only: [:_id, :name, :email, :created_at, :updated_at]),
          pagination: {
            page: page,
            limit: limit,
            total: total,
            pages: (total.to_f / limit).ceil
          }
        }
      end

      # GET /api/v1/users/:id
      def show
        render json: @user.as_json(only: [:_id, :name, :email, :created_at, :updated_at])
      end

      # POST /api/v1/users
      def create
        user = User.new(user_params)
        if user.save
          render json: user.as_json(only: [:_id, :name, :email, :created_at]),
                 status: :created
        else
          render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/users/:id
      def update
        if @user.update(user_params)
          render json: @user.as_json(only: [:_id, :name, :email, :updated_at])
        else
          render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/users/:id
      def destroy
        @user.destroy
        head :no_content
      end

      private

      def set_user
        @user = User.find(params[:id])
      rescue Mongoid::Errors::DocumentNotFound
        render json: { error: 'User not found' }, status: :not_found
      end

      def user_params
        params.require(:user).permit(:name, :email)
      end
    end
  end
end
```

## Routes

```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :users, only: [:index, :show, :create, :update, :destroy]
    end
  end
end
```

## Pagination with Kaminari

Add pagination support:

```ruby
# Gemfile
gem 'kaminari-mongoid'
```

```ruby
# config/initializers/kaminari_config.rb
Kaminari.configure do |config|
  config.default_per_page = 20
  config.max_per_page = 100
end
```

## Creating Indexes

```bash
# Run in the Rails console or as a rake task
rails db:mongoid:create_indexes
```

## Testing with curl

```bash
# Create user
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"user": {"name": "Alice", "email": "alice@example.com"}}'

# List users
curl "http://localhost:3000/api/v1/users?page=1&limit=10"

# Update user
curl -X PATCH http://localhost:3000/api/v1/users/64abc123def4567890123456 \
  -H "Content-Type: application/json" \
  -d '{"user": {"name": "Alice Smith"}}'
```

## Summary

Rails with Mongoid provides a productive ODM-based approach to building MongoDB REST APIs. Mongoid's `include Mongoid::Document` and `include Mongoid::Timestamps` modules bring ActiveRecord-like validations and callbacks to MongoDB documents, and the standard Rails routing and controller conventions apply directly with no changes needed for the API layer.
