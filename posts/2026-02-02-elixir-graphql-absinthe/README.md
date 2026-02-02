# How to Implement GraphQL with Absinthe in Elixir

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Elixir, GraphQL, Absinthe, Phoenix, API

Description: A practical guide to building GraphQL APIs in Elixir with Absinthe, covering schemas, resolvers, subscriptions, and integration with Phoenix.

---

> Building APIs in Elixir? GraphQL with Absinthe gives you type safety, flexible queries, and real-time subscriptions out of the box. It's one of the best GraphQL implementations in any language.

If you've been building REST APIs and are curious about GraphQL, Elixir's Absinthe library is a fantastic way to get started. It takes full advantage of Elixir's strengths - pattern matching, fault tolerance, and the actor model - to deliver a production-ready GraphQL implementation.

---

## Why Absinthe?

Absinthe isn't just a GraphQL parser. It's a complete toolkit that integrates deeply with Phoenix and the OTP ecosystem. Here's what makes it stand out:

| Feature | Benefit |
|---------|---------|
| Native Elixir macros | Define schemas with idiomatic Elixir code |
| Phoenix integration | Plug-and-play with existing Phoenix apps |
| Subscriptions | Real-time updates via Phoenix Channels |
| Dataloader | Efficient batching to solve N+1 queries |
| Middleware | Add authentication, logging, and error handling |

---

## Setting Up Your Project

First, add Absinthe and its Phoenix integration to your `mix.exs`:

```elixir
# mix.exs
defp deps do
  [
    {:absinthe, "~> 1.7"},
    {:absinthe_plug, "~> 1.5"},
    {:absinthe_phoenix, "~> 2.0"}  # For subscriptions
  ]
end
```

Run `mix deps.get` to fetch the dependencies.

---

## Defining Your Schema

The schema is the heart of any GraphQL API. In Absinthe, you define it using Elixir modules and macros.

```elixir
# lib/my_app_web/schema.ex
defmodule MyAppWeb.Schema do
  use Absinthe.Schema

  # Import your type definitions
  import_types MyAppWeb.Schema.UserTypes
  import_types MyAppWeb.Schema.PostTypes

  # Root query type - entry point for all read operations
  query do
    @desc "Get a user by ID"
    field :user, :user do
      arg :id, non_null(:id)
      resolve &MyAppWeb.Resolvers.Users.get_user/3
    end

    @desc "List all users with optional filtering"
    field :users, list_of(:user) do
      arg :limit, :integer, default_value: 20
      arg :offset, :integer, default_value: 0
      resolve &MyAppWeb.Resolvers.Users.list_users/3
    end
  end

  # Root mutation type - entry point for all write operations
  mutation do
    @desc "Create a new user"
    field :create_user, :user do
      arg :input, non_null(:create_user_input)
      resolve &MyAppWeb.Resolvers.Users.create_user/3
    end

    @desc "Update an existing user"
    field :update_user, :user do
      arg :id, non_null(:id)
      arg :input, non_null(:update_user_input)
      resolve &MyAppWeb.Resolvers.Users.update_user/3
    end
  end
end
```

---

## Object Types

Define your domain objects as separate type modules to keep things organized.

```elixir
# lib/my_app_web/schema/user_types.ex
defmodule MyAppWeb.Schema.UserTypes do
  use Absinthe.Schema.Notation

  # User object type - represents a user in the system
  object :user do
    field :id, non_null(:id)
    field :email, non_null(:string)
    field :name, :string
    field :inserted_at, non_null(:datetime)

    # Nested relationship - fetch posts for this user
    field :posts, list_of(:post) do
      resolve &MyAppWeb.Resolvers.Posts.posts_for_user/3
    end
  end

  # Input type for creating users
  input_object :create_user_input do
    field :email, non_null(:string)
    field :name, :string
    field :password, non_null(:string)
  end

  # Input type for updating users - all fields optional
  input_object :update_user_input do
    field :email, :string
    field :name, :string
  end
end
```

Here's a quick reference for Absinthe's built-in scalar types:

| Absinthe Type | Elixir Type | Description |
|---------------|-------------|-------------|
| `:id` | String | Unique identifier |
| `:string` | String | UTF-8 text |
| `:integer` | Integer | Whole numbers |
| `:float` | Float | Decimal numbers |
| `:boolean` | Boolean | true/false |
| `:datetime` | DateTime | ISO 8601 datetime |

---

## Writing Resolvers

Resolvers are functions that fetch the actual data. They receive three arguments: the parent object, the arguments, and the resolution context.

```elixir
# lib/my_app_web/resolvers/users.ex
defmodule MyAppWeb.Resolvers.Users do
  alias MyApp.Accounts

  # Resolver function signature: (parent, args, resolution) -> {:ok, result} | {:error, message}

  def get_user(_parent, %{id: id}, _resolution) do
    case Accounts.get_user(id) do
      nil -> {:error, "User not found"}
      user -> {:ok, user}
    end
  end

  def list_users(_parent, args, _resolution) do
    # args contains :limit and :offset with defaults from schema
    users = Accounts.list_users(args)
    {:ok, users}
  end

  def create_user(_parent, %{input: input}, _resolution) do
    case Accounts.create_user(input) do
      {:ok, user} -> {:ok, user}
      {:error, changeset} -> {:error, format_errors(changeset)}
    end
  end

  def update_user(_parent, %{id: id, input: input}, _resolution) do
    with user when not is_nil(user) <- Accounts.get_user(id),
         {:ok, updated} <- Accounts.update_user(user, input) do
      {:ok, updated}
    else
      nil -> {:error, "User not found"}
      {:error, changeset} -> {:error, format_errors(changeset)}
    end
  end

  # Convert Ecto changeset errors to GraphQL-friendly format
  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
```

---

## Phoenix Integration

Wire up Absinthe to your Phoenix router to expose the GraphQL endpoint.

```elixir
# lib/my_app_web/router.ex
defmodule MyAppWeb.Router do
  use MyAppWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api" do
    pipe_through :api

    # GraphQL endpoint - handles all queries and mutations
    forward "/graphql", Absinthe.Plug, schema: MyAppWeb.Schema

    # GraphiQL interface for development - interactive query builder
    if Mix.env() == :dev do
      forward "/graphiql", Absinthe.Plug.GraphiQL,
        schema: MyAppWeb.Schema,
        interface: :playground
    end
  end
end
```

Now you can send GraphQL queries to `/api/graphql` and use the interactive playground at `/api/graphiql` during development.

---

## Real-time Subscriptions

Absinthe subscriptions let clients receive real-time updates through Phoenix Channels.

```elixir
# Add to your schema
subscription do
  @desc "Subscribe to new posts by a specific user"
  field :new_post, :post do
    arg :user_id, non_null(:id)

    config fn %{user_id: user_id}, _resolution ->
      # Return the topic this subscription should listen to
      {:ok, topic: "user:#{user_id}:posts"}
    end
  end
end
```

Set up the socket for subscriptions:

```elixir
# lib/my_app_web/channels/user_socket.ex
defmodule MyAppWeb.UserSocket do
  use Phoenix.Socket
  use Absinthe.Phoenix.Socket, schema: MyAppWeb.Schema

  def connect(_params, socket, _connect_info) do
    {:ok, socket}
  end

  def id(_socket), do: nil
end
```

Publish events from your application code:

```elixir
# When a new post is created, notify subscribers
def create_post(attrs, user) do
  case Posts.create_post(attrs, user) do
    {:ok, post} ->
      # Publish to all subscribed clients
      Absinthe.Subscription.publish(
        MyAppWeb.Endpoint,
        post,
        new_post: "user:#{user.id}:posts"
      )
      {:ok, post}

    error ->
      error
  end
end
```

---

## Authentication Middleware

Add authentication by creating custom middleware or using the context.

```elixir
# lib/my_app_web/plugs/graphql_context.ex
defmodule MyAppWeb.Plugs.GraphQLContext do
  @behaviour Plug

  def init(opts), do: opts

  def call(conn, _opts) do
    context = build_context(conn)
    Absinthe.Plug.put_options(conn, context: context)
  end

  defp build_context(conn) do
    with ["Bearer " <> token] <- get_req_header(conn, "authorization"),
         {:ok, user} <- MyApp.Auth.verify_token(token) do
      %{current_user: user}
    else
      _ -> %{}
    end
  end
end
```

Use the context in your resolvers:

```elixir
def create_post(_parent, %{input: input}, %{context: context}) do
  case context do
    %{current_user: user} ->
      Posts.create_post(input, user)

    _ ->
      {:error, "Authentication required"}
  end
end
```

---

## Wrapping Up

Absinthe makes building GraphQL APIs in Elixir feel natural. The combination of Elixir's pattern matching, Phoenix's real-time capabilities, and Absinthe's well-designed macros gives you a powerful foundation for building APIs.

Key points to remember:
- Define your schema using Absinthe macros in dedicated modules
- Keep resolvers simple - they should delegate to your business logic
- Use input types to validate incoming data
- Subscriptions leverage Phoenix Channels for real-time updates
- Add authentication through the resolution context

Start with queries and mutations, get comfortable with the schema DSL, and then add subscriptions when you need real-time features. The GraphiQL interface is your best friend during development.
