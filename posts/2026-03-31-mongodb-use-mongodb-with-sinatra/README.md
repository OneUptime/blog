# How to Use MongoDB with Sinatra

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Sinatra, Ruby

Description: Build a lightweight Ruby API with Sinatra and MongoDB using Mongoid or the official Ruby driver, with routes, JSON responses, and connection management.

---

## Sinatra and MongoDB

Sinatra is a lightweight Ruby web framework ideal for small APIs and microservices. It has no database layer built in, making it flexible to pair with any database. For MongoDB, you can use either the `mongo` gem (official driver) directly or `mongoid` (ODM) for a higher-level API.

## Setup

Create `Gemfile`:

```ruby
source 'https://rubygems.org'

gem 'sinatra'
gem 'sinatra-contrib'
gem 'mongoid', '~> 8.0'
gem 'json'
gem 'rack'
```

```bash
bundle install
```

## Mongoid Configuration

Create `config/mongoid.yml`:

```yaml
default:
  clients:
    default:
      uri: <%= ENV['MONGO_URI'] || 'mongodb://localhost:27017/sinatraapp' %>
      options:
        max_pool_size: 10
        server_selection_timeout: 5
```

## Model

```ruby
# models/item.rb
class Item
  include Mongoid::Document
  include Mongoid::Timestamps

  field :name,        type: String
  field :description, type: String
  field :price,       type: Float
  field :in_stock,    type: Boolean, default: true

  index({ name: 1 })

  validates :name,  presence: true
  validates :price, numericality: { greater_than_or_equal_to: 0 }

  scope :available, -> { where(in_stock: true) }
end
```

## Sinatra Application

```ruby
# app.rb
require 'sinatra'
require 'sinatra/json'
require 'mongoid'
require_relative 'models/item'

Mongoid.load!(File.join(File.dirname(__FILE__), 'config', 'mongoid.yml'), :default)

set :port, 3000

get '/items' do
  items = Item.available.order(name: :asc).limit(50)
  json items.map { |i| { id: i.id.to_s, name: i.name, price: i.price, inStock: i.in_stock } }
end

get '/items/:id' do
  item = Item.find_by(id: params[:id]) rescue nil
  halt 404, json(error: 'Item not found') unless item
  json id: item.id.to_s, name: item.name, description: item.description, price: item.price
end

post '/items' do
  request.body.rewind
  data = JSON.parse(request.body.read)
  item = Item.new(name: data['name'], description: data['description'], price: data['price'])
  if item.save
    status 201
    json id: item.id.to_s, name: item.name, price: item.price
  else
    status 422
    json errors: item.errors.full_messages
  end
end

patch '/items/:id' do
  item = Item.find_by(id: params[:id]) rescue nil
  halt 404, json(error: 'Item not found') unless item

  request.body.rewind
  data = JSON.parse(request.body.read)
  item.update!(data.slice('name', 'price', 'in_stock'))
  json id: item.id.to_s, name: item.name, price: item.price, inStock: item.in_stock
end

delete '/items/:id' do
  Item.find_by(id: params[:id])&.destroy
  status 204
end
```

## Running the Application

```bash
MONGO_URI="mongodb://localhost:27017/sinatraapp" ruby app.rb
```

## Using the Raw MongoDB Driver (Alternative)

For a lighter approach without Mongoid:

```ruby
require 'mongo'

$mongo = Mongo::Client.new(
  ENV.fetch('MONGO_URI', 'mongodb://localhost:27017/sinatraapp'),
  max_pool_size: 10,
)
$db = $mongo.database

get '/items' do
  items = $db[:items].find({}, limit: 50).to_a
  json items.map { |i| i.merge('_id' => i['_id'].to_s) }
end
```

## Summary

Sinatra with MongoDB is a minimal stack ideal for microservices and internal APIs. Use Mongoid for its ActiveRecord-like DSL with validations, scopes, and timestamps, or use the raw `mongo` gem when you want less abstraction. Configure Mongoid through `mongoid.yml`, define models in separate files, and keep your Sinatra routes thin by delegating query logic to model scopes and custom methods.
