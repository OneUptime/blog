# How to Cache Rails Views and Fragments with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Ruby On Rail, Fragment Caching, View Caching, Ruby

Description: Use Redis-backed fragment caching in Rails views to cache expensive partials and page sections with automatic expiration and Russian doll caching.

---

## Introduction

Fragment caching stores rendered HTML snippets in the cache store, so repeated requests skip ERB rendering and database queries. Rails' built-in caching helpers work seamlessly with the Redis cache store, supporting single fragments, nested (Russian doll) caching, and collection caching.

## Setup

Configure Redis as the cache store in `config/environments/development.rb` and `production.rb`:

```ruby
config.cache_store = :redis_cache_store, {
  url: ENV.fetch("REDIS_URL", "redis://localhost:6379/1"),
  expires_in: 1.hour,
}
config.action_controller.perform_caching = true
```

## Basic Fragment Caching

Wrap expensive view sections in a `cache` block:

```erb
<%# app/views/products/index.html.erb %>

<h1>Products</h1>

<%# Cache the entire list for 10 minutes %>
<% cache "products/index/v1", expires_in: 10.minutes do %>
  <ul>
    <% @products.each do |product| %>
      <li><%= product.name %> - $<%= product.price %></li>
    <% end %>
  </ul>
<% end %>
```

## Model-Based Cache Keys

Pass an ActiveRecord model as the cache key - Rails automatically uses the model's `cache_key_with_version` (id + updated_at):

```erb
<%# Automatically expires when the product is updated %>
<% cache @product do %>
  <div class="product-card">
    <h2><%= @product.name %></h2>
    <p><%= @product.description %></p>
    <strong>$<%= @product.price %></strong>
  </div>
<% end %>
```

## Russian Doll Caching (Nested Caching)

Nest cache blocks so inner fragments can expire independently:

```erb
<%# Outer cache: expires when any product in the collection changes %>
<% cache ["products/list", @products.maximum(:updated_at)] do %>
  <div class="product-grid">
    <%# Inner cache: expires when this specific product changes %>
    <% @products.each do |product| %>
      <% cache product do %>
        <%= render partial: "products/card", locals: { product: product } %>
      <% end %>
    <% end %>
  </div>
<% end %>
```

## Collection Caching

Cache an entire collection of partials efficiently in one operation:

```erb
<%# Renders and caches all product partials in a single cache read %>
<%= render partial: "products/product",
           collection: @products,
           cached: true %>
```

The `cached: true` option reads all cache entries in one multi-get operation, falling back to rendering only the uncached items.

## Caching Partials Explicitly

```erb
<%# app/views/products/_product.html.erb %>
<% cache product do %>
  <div class="product" data-id="<%= product.id %>">
    <h3><%= product.name %></h3>
    <p class="price"><%= number_to_currency(product.price) %></p>
    <p class="stock"><%= product.stock %> in stock</p>
    <%= link_to "View", product_path(product) %>
  </div>
<% end %>
```

## Controller-Level Caching with Low-Level API

Cache data in the controller using the low-level `Rails.cache` API:

```ruby
class CategoriesController < ApplicationController
  def index
    @categories = Rails.cache.fetch("categories/all_with_counts", expires_in: 30.minutes) do
      Category.includes(:products).map do |cat|
        { id: cat.id, name: cat.name, product_count: cat.products.count }
      end
    end
  end
end
```

## Sweeping Stale Fragments

Invalidate cached fragments when data changes:

```ruby
class Product < ApplicationRecord
  after_commit :expire_caches

  private

  def expire_caches
    ActionController::Base.new.expire_fragment("products/index/v1")
    Rails.cache.delete_matched("products/*")
    # The model-based cache key is automatically invalidated because
    # updated_at changes on every commit
  end
end
```

## Conditional Caching

Skip caching for admin users or preview modes:

```erb
<% cache_unless current_user&.admin?, @product do %>
  <%= render "product_details", product: @product %>
<% end %>
```

## Summary

Rails fragment caching with Redis works by wrapping view sections in `cache` blocks with model objects or string keys. Model-based keys automatically expire when the record is updated via `updated_at`. Russian doll caching nests fragments so outer caches expire when any child changes, while inner caches can still be reused. Collection caching with `cached: true` dramatically reduces the number of cache reads for list views by fetching all fragments in a single Redis multi-get call.
