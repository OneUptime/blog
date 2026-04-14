# How to Use Dapr with Ruby on Rails Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Ruby On Rail, Microservice, Ruby, Service Invocation

Description: Add Dapr capabilities to Ruby on Rails applications for service invocation, state management, and pub/sub in a Rails microservices architecture.

---

Ruby on Rails excels at rapid development, and Dapr extends its capabilities for microservice architectures by providing state management, pub/sub, and service invocation through a standard HTTP API. Since Dapr exposes an HTTP sidecar, Rails apps can integrate without a dedicated Ruby SDK.

## Architecture Overview

Rails integrates with Dapr via HTTP calls to the local Dapr sidecar. The sidecar runs alongside the Rails app and routes requests to other services, state stores, and pub/sub brokers.

## Setting Up Rails with Dapr HTTP

Add HTTParty for Dapr HTTP calls in `Gemfile`:

```ruby
gem 'httparty'
```

Create a Dapr client service:

```ruby
# app/services/dapr_client.rb
require 'httparty'
require 'json'

class DaprClient
  include HTTParty

  DAPR_PORT = ENV.fetch('DAPR_HTTP_PORT', '3500')
  BASE_URL = "http://localhost:#{DAPR_PORT}"

  def self.get_state(store_name, key)
    response = get("#{BASE_URL}/v1.0/state/#{store_name}/#{key}")
    return nil if response.code == 204 || response.body.empty?
    JSON.parse(response.body)
  rescue => e
    Rails.logger.error("Dapr state get failed: #{e.message}")
    nil
  end

  def self.save_state(store_name, key, value)
    body = [{ key: key, value: value }].to_json
    post(
      "#{BASE_URL}/v1.0/state/#{store_name}",
      body: body,
      headers: { 'Content-Type' => 'application/json' }
    )
  end

  def self.publish_event(pubsub_name, topic, data)
    post(
      "#{BASE_URL}/v1.0/publish/#{pubsub_name}/#{topic}",
      body: data.to_json,
      headers: { 'Content-Type' => 'application/json' }
    )
  end

  def self.invoke_service(app_id, method, http_verb: :get, body: nil)
    url = "#{BASE_URL}/v1.0/invoke/#{app_id}/method/#{method}"
    options = { headers: { 'Content-Type' => 'application/json' } }
    options[:body] = body.to_json if body
    send(http_verb, url, options)
  end
end
```

## Building Rails Controllers with Dapr

Create an orders controller:

```ruby
# app/controllers/orders_controller.rb
class OrdersController < ApplicationController
  def index
    orders = DaprClient.get_state('statestore', 'all-orders') || []
    render json: orders
  end

  def create
    order = order_params.to_h.merge(
      'id' => SecureRandom.uuid,
      'status' => 'pending',
      'created_at' => Time.current.iso8601
    )

    # Check inventory via Dapr service invocation
    inventory_response = DaprClient.invoke_service(
      'inventory-service',
      "inventory/#{order['product_id']}"
    )

    if JSON.parse(inventory_response.body)['quantity'].to_i < order['quantity'].to_i
      return render json: { error: 'Insufficient inventory' }, status: :conflict
    end

    # Save order
    all_orders = DaprClient.get_state('statestore', 'all-orders') || []
    all_orders << order
    DaprClient.save_state('statestore', 'all-orders', all_orders)
    DaprClient.save_state('statestore', "order-#{order['id']}", order)

    # Publish event
    DaprClient.publish_event('pubsub', 'order-created', order)

    render json: order, status: :created
  end

  private

  def order_params
    params.require(:order).permit(:product_id, :quantity, :customer_id)
  end
end
```

## Handling Dapr Pub/Sub Subscriptions

Rails needs to expose the Dapr subscription discovery endpoint:

```ruby
# config/routes.rb
Rails.application.routes.draw do
  resources :orders, only: [:index, :create, :show]
  get '/dapr/subscribe', to: 'dapr_subscriptions#index'
  post '/orders/payment-completed', to: 'orders#payment_completed'
end
```

```ruby
# app/controllers/dapr_subscriptions_controller.rb
class DaprSubscriptionsController < ApplicationController
  def index
    subscriptions = [
      {
        pubsubname: 'pubsub',
        topic: 'payment-completed',
        route: '/orders/payment-completed'
      }
    ]
    render json: subscriptions
  end
end
```

Handle incoming events in OrdersController:

```ruby
def payment_completed
  event_data = params[:data] || {}
  order_id = event_data['order_id']

  order = DaprClient.get_state('statestore', "order-#{order_id}")
  if order
    order['status'] = 'paid'
    DaprClient.save_state('statestore', "order-#{order_id}", order)
  end

  render json: { status: 'SUCCESS' }
end
```

## Running with Dapr CLI

```bash
dapr run \
  --app-id order-service \
  --app-port 3000 \
  --dapr-http-port 3500 \
  -- bundle exec rails server -p 3000
```

## Summary

Ruby on Rails integrates with Dapr through HTTP API calls to the local sidecar, avoiding the need for a dedicated Ruby SDK. Rails controllers call Dapr endpoints for state management and service invocation, while the subscription discovery endpoint enables Dapr to deliver pub/sub events to Rails routes.
