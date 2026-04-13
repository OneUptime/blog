# How to Use MongoDB with Ruby on Rails API Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Ruby On Rail, Mongoid, Database, API

Description: Learn how to integrate MongoDB into a Ruby on Rails API-only application using Mongoid ODM, from setup through querying and deployment.

---

## Why MongoDB with Rails API Mode

Rails API mode strips away browser-focused middleware, making it an efficient backend for JSON services. Pairing it with MongoDB gives you a flexible document store that aligns naturally with JSON payloads. Mongoid, the official ODM for Ruby, provides an ActiveRecord-like interface so Rails developers feel right at home.

## Installation and Setup

Create a new Rails API project without Active Record, then add Mongoid:

```bash
rails new my_api --api --skip-active-record
cd my_api
```

Add to your `Gemfile`:

```ruby
gem 'mongoid', '~> 8.1'
```

Then run:

```bash
bundle install
rails g mongoid:config
```

This generates `config/mongoid.yml`. Update the development section to match your MongoDB connection:

```yaml
development:
  clients:
    default:
      uri: <%= ENV['MONGODB_URI'] || 'mongodb://localhost:27017/my_api_development' %>
      options:
        server_selection_timeout: 5
        max_pool_size: 10
```

## Defining a Mongoid Model

Mongoid documents replace ActiveRecord models. Define fields explicitly:

```ruby
# app/models/product.rb
class Product
  include Mongoid::Document
  include Mongoid::Timestamps

  field :name,        type: String
  field :price,       type: Float
  field :in_stock,    type: Boolean, default: true
  field :tags,        type: Array

  validates :name, presence: true
  validates :price, numericality: { greater_than: 0 }

  index({ name: 1 }, { unique: true })
  index({ tags: 1 })
end
```

## Building the Controller

Rails API controllers return JSON by default:

```ruby
# app/controllers/products_controller.rb
class ProductsController < ApplicationController
  before_action :set_product, only: [:show, :update, :destroy]

  def index
    products = Product.where(in_stock: true).order(name: :asc)
    render json: products, status: :ok
  end

  def create
    product = Product.new(product_params)
    if product.save
      render json: product, status: :created
    else
      render json: { errors: product.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def show
    render json: @product
  end

  def update
    if @product.update(product_params)
      render json: @product
    else
      render json: { errors: @product.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @product.destroy
    head :no_content
  end

  private

  def set_product
    @product = Product.find(params[:id])
  rescue Mongoid::Errors::DocumentNotFound
    render json: { error: 'Not found' }, status: :not_found
  end

  def product_params
    params.require(:product).permit(:name, :price, :in_stock, tags: [])
  end
end
```

## Running Queries

Mongoid exposes chainable criteria that map to MongoDB operators:

```ruby
# Find products under $50 with a specific tag
cheap_gadgets = Product.where(:price.lt => 50, tags: 'gadget')

# Aggregation - average price per tag
Product.collection.aggregate([
  { "$unwind" => "$tags" },
  { "$group" => { "_id" => "$tags", "avg_price" => { "$avg" => "$price" } } },
  { "$sort" => { "avg_price" => -1 } }
]).to_a
```

## Running the Server

```bash
MONGODB_URI=mongodb://localhost:27017/my_api_development rails s -p 3000
```

Test with curl:

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"product":{"name":"Widget","price":9.99,"tags":["gadget"]}}'
```

## Summary

Ruby on Rails API mode combined with Mongoid and MongoDB is a productive stack for JSON-first backends. By skipping Active Record and using Mongoid's document model, you get flexible schema design, rich querying, and the familiar Rails conventions - with minimal boilerplate to wire everything together.
