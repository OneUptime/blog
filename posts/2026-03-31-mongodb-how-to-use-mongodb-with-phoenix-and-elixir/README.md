# How to Use MongoDB with Phoenix and Elixir

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Elixir, Phoenix, Mongodb Driver, Database

Description: Learn how to integrate MongoDB into a Phoenix web application using the official MongoDB Elixir driver, with practical CRUD and query examples.

---

## Why MongoDB with Elixir

Elixir's concurrency model and fault-tolerance pair well with MongoDB's horizontal scalability. While Ecto is the default database layer for Phoenix, the community-maintained MongoDB Elixir driver (`mongodb_driver`) lets you interact with MongoDB directly in a process-safe, idiomatic way.

## Installation

Add the driver and a connection pool library to your `mix.exs`:

```elixir
defp deps do
  [
    {:mongodb_driver, "~> 1.4"},
    {:db_connection, "~> 2.6"}
  ]
end
```

Fetch dependencies:

```bash
mix deps.get
```

## Configuring the Connection

Add your MongoDB connection to `config/config.exs`:

```elixir
config :my_app, :mongo,
  url: System.get_env("MONGODB_URI") || "mongodb://localhost:27017/my_app_dev",
  pool_size: 5
```

Start a connection in your application supervisor (`lib/my_app/application.ex`):

```elixir
def start(_type, _args) do
  mongo_opts = Application.get_env(:my_app, :mongo)

  children = [
    {Mongo, Keyword.merge(mongo_opts, name: :mongo)}
  ]

  opts = [strategy: :one_for_one, name: MyApp.Supervisor]
  Supervisor.start_link(children, opts)
end
```

## Creating a Context Module

Wrap MongoDB operations in a context module to keep Phoenix controllers clean:

```elixir
defmodule MyApp.Catalog do
  @collection "products"

  def list_products do
    :mongo
    |> Mongo.find(@collection, %{}, sort: %{name: 1})
    |> Enum.to_list()
  end

  def get_product!(id) do
    case Mongo.find_one(:mongo, @collection, %{"_id" => BSON.ObjectId.decode!(id)}) do
      nil -> raise "Product not found"
      doc -> doc
    end
  end

  def create_product(attrs) do
    Mongo.insert_one(:mongo, @collection, attrs)
  end

  def update_product(id, attrs) do
    Mongo.update_one(
      :mongo,
      @collection,
      %{"_id" => BSON.ObjectId.decode!(id)},
      %{"$set" => attrs}
    )
  end

  def delete_product(id) do
    Mongo.delete_one(
      :mongo,
      @collection,
      %{"_id" => BSON.ObjectId.decode!(id)}
    )
  end
end
```

## Phoenix Controller

Wire the context into a JSON controller:

```elixir
defmodule MyAppWeb.ProductController do
  use MyAppWeb, :controller
  alias MyApp.Catalog

  def index(conn, _params) do
    products = Catalog.list_products()
    json(conn, products)
  end

  def create(conn, %{"product" => attrs}) do
    case Catalog.create_product(attrs) do
      {:ok, result} ->
        conn
        |> put_status(:created)
        |> json(%{id: BSON.ObjectId.encode!(result.inserted_id)})
      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: inspect(reason)})
    end
  end
end
```

## Running Queries

The driver supports the full MongoDB query language:

```elixir
# Find documents matching a filter with projection
Mongo.find(:mongo, "products",
  %{"price" => %{"$lt" => 50}},
  projection: %{"name" => 1, "price" => 1},
  limit: 10
) |> Enum.to_list()

# Count matching documents
Mongo.count_documents(:mongo, "products", %{"in_stock" => true})
```

## Starting the Server

```bash
MONGODB_URI=mongodb://localhost:27017/my_app_dev mix phx.server
```

## Summary

Using MongoDB with Phoenix and Elixir via `mongodb_driver` provides direct, idiomatic access to MongoDB's full feature set. The driver integrates naturally with OTP supervision trees for connection pooling, and Phoenix's context-based architecture keeps database logic well organized and testable.
