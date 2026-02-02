# How to Build Web Applications with Phoenix Framework

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Elixir, Phoenix, Web Development, MVC, Real-time

Description: A comprehensive guide to building web applications with Phoenix Framework, covering project setup, routing, controllers, templates, and database integration.

---

Phoenix is a web framework built on Elixir that brings the productivity of frameworks like Rails while delivering exceptional performance. It runs on the Erlang VM (BEAM), which was designed for building low-latency, fault-tolerant distributed systems. If you need to handle millions of concurrent connections or want real-time features without reaching for external tools, Phoenix is worth your attention.

## Why Phoenix?

Before diving into code, here's a quick comparison with other popular frameworks:

| Feature | Phoenix | Rails | Express | Django |
|---------|---------|-------|---------|--------|
| Language | Elixir | Ruby | JavaScript | Python |
| Concurrency Model | Actor-based (lightweight processes) | Thread-based | Event loop | Thread-based |
| WebSocket Support | Built-in (Channels) | Action Cable | Socket.io (external) | Channels (Django 3+) |
| Hot Code Reloading | Yes | Yes | Partial | Yes |
| Typical Response Time | < 1ms | 10-50ms | 5-20ms | 10-30ms |

Phoenix shines when you need real-time features, high concurrency, or fault tolerance. The trade-off is learning Elixir's functional programming paradigm.

## 1. Installing Prerequisites

You need Elixir, Erlang, and Node.js (for asset compilation). On macOS with Homebrew:

```bash
# Install Elixir (includes Erlang as a dependency)
brew install elixir

# Verify installation
elixir --version
# Should show Elixir 1.15+ and Erlang/OTP 26+

# Install Hex package manager
mix local.hex

# Install the Phoenix project generator
mix archive.install hex phx_new
```

## 2. Creating a New Phoenix Project

Generate a new project with Ecto (database layer) and HTML support:

```bash
# Create a new Phoenix project called "blog_app"
mix phx.new blog_app

# When prompted, say Y to install dependencies
# This creates the project structure and fetches Elixir packages
```

The generator creates this structure:

```
blog_app/
  lib/
    blog_app/           # Business logic (contexts)
    blog_app_web/       # Web layer (controllers, views, templates)
  priv/
    repo/migrations/    # Database migrations
    static/             # Static assets
  config/               # Environment configurations
  mix.exs               # Project dependencies (like package.json)
```

Now set up the database and start the server:

```bash
cd blog_app

# Create the PostgreSQL database (configure credentials in config/dev.exs)
mix ecto.create

# Start the Phoenix server with live reload
mix phx.server
```

Visit `http://localhost:4000` to see the welcome page.

## 3. Understanding Routing

Routes map URLs to controller actions. Open `lib/blog_app_web/router.ex`:

```elixir
defmodule BlogAppWeb.Router do
  use BlogAppWeb, :router

  # Pipeline for browser requests - adds session, CSRF protection, etc.
  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {BlogAppWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  # Pipeline for API requests - no session, just JSON
  pipeline :api do
    plug :accepts, ["json"]
  end

  # Browser routes
  scope "/", BlogAppWeb do
    pipe_through :browser

    get "/", PageController, :home
    # RESTful routes for posts
    resources "/posts", PostController
  end

  # API routes (versioned)
  scope "/api/v1", BlogAppWeb.API.V1 do
    pipe_through :api

    resources "/posts", PostController, except: [:new, :edit]
  end
end
```

The `resources` macro generates all RESTful routes automatically:

| HTTP Method | Path | Controller Action | Purpose |
|-------------|------|-------------------|---------|
| GET | /posts | index | List all posts |
| GET | /posts/new | new | Form for new post |
| POST | /posts | create | Create a post |
| GET | /posts/:id | show | Show a single post |
| GET | /posts/:id/edit | edit | Form for editing |
| PATCH/PUT | /posts/:id | update | Update a post |
| DELETE | /posts/:id | delete | Delete a post |

## 4. Building Controllers

Controllers handle incoming requests and return responses. Create `lib/blog_app_web/controllers/post_controller.ex`:

```elixir
defmodule BlogAppWeb.PostController do
  use BlogAppWeb, :controller

  # Import the Blog context where business logic lives
  alias BlogApp.Blog
  alias BlogApp.Blog.Post

  # GET /posts - List all posts
  def index(conn, _params) do
    posts = Blog.list_posts()
    render(conn, :index, posts: posts)
  end

  # GET /posts/new - Show form for new post
  def new(conn, _params) do
    changeset = Blog.change_post(%Post{})
    render(conn, :new, changeset: changeset)
  end

  # POST /posts - Create a new post
  def create(conn, %{"post" => post_params}) do
    case Blog.create_post(post_params) do
      {:ok, post} ->
        conn
        |> put_flash(:info, "Post created successfully.")
        |> redirect(to: ~p"/posts/#{post}")

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, :new, changeset: changeset)
    end
  end

  # GET /posts/:id - Show a single post
  def show(conn, %{"id" => id}) do
    post = Blog.get_post!(id)
    render(conn, :show, post: post)
  end

  # DELETE /posts/:id - Delete a post
  def delete(conn, %{"id" => id}) do
    post = Blog.get_post!(id)
    {:ok, _post} = Blog.delete_post(post)

    conn
    |> put_flash(:info, "Post deleted successfully.")
    |> redirect(to: ~p"/posts")
  end
end
```

Notice how pattern matching in function arguments extracts the `id` parameter directly. This is idiomatic Elixir.

## 5. Working with Ecto (Database Layer)

Ecto is Phoenix's database wrapper. Generate a schema and migration:

```bash
# Generate a Post schema with title and body fields
mix phx.gen.schema Blog.Post posts title:string body:text published:boolean
```

This creates a migration file. Run it:

```bash
mix ecto.migrate
```

The generated schema in `lib/blog_app/blog/post.ex`:

```elixir
defmodule BlogApp.Blog.Post do
  use Ecto.Schema
  import Ecto.Changeset

  schema "posts" do
    field :title, :string
    field :body, :string
    field :published, :boolean, default: false

    timestamps()  # Adds inserted_at and updated_at
  end

  # Changeset validates and casts external data to the schema
  def changeset(post, attrs) do
    post
    |> cast(attrs, [:title, :body, :published])
    |> validate_required([:title, :body])
    |> validate_length(:title, min: 3, max: 100)
    |> validate_length(:body, min: 10)
  end
end
```

Now create a context module to handle business logic in `lib/blog_app/blog.ex`:

```elixir
defmodule BlogApp.Blog do
  import Ecto.Query
  alias BlogApp.Repo
  alias BlogApp.Blog.Post

  # Fetch all posts ordered by newest first
  def list_posts do
    Post
    |> order_by(desc: :inserted_at)
    |> Repo.all()
  end

  # Fetch a single post or raise if not found
  def get_post!(id), do: Repo.get!(Post, id)

  # Create a new post
  def create_post(attrs \\ %{}) do
    %Post{}
    |> Post.changeset(attrs)
    |> Repo.insert()
  end

  # Update an existing post
  def update_post(%Post{} = post, attrs) do
    post
    |> Post.changeset(attrs)
    |> Repo.update()
  end

  # Delete a post
  def delete_post(%Post{} = post) do
    Repo.delete(post)
  end

  # Return a changeset for tracking changes (used in forms)
  def change_post(%Post{} = post, attrs \\ %{}) do
    Post.changeset(post, attrs)
  end
end
```

## 6. Templates with HEEx

Phoenix uses HEEx (HTML + Embedded Elixir) for templates. Create `lib/blog_app_web/controllers/post_html/index.html.heex`:

```heex
<.header>
  Posts
  <:actions>
    <.link href={~p"/posts/new"}>
      <.button>New Post</.button>
    </.link>
  </:actions>
</.header>

<.table id="posts" rows={@posts} row_click={&JS.navigate(~p"/posts/#{&1}")}>
  <:col :let={post} label="Title"><%= post.title %></:col>
  <:col :let={post} label="Published"><%= post.published %></:col>
  <:col :let={post} label="Created"><%= post.inserted_at %></:col>
  <:action :let={post}>
    <.link href={~p"/posts/#{post}/edit"}>Edit</.link>
  </:action>
  <:action :let={post}>
    <.link href={~p"/posts/#{post}"} method="delete" data-confirm="Are you sure?">
      Delete
    </.link>
  </:action>
</.table>
```

The `~p` sigil generates verified routes - compile-time errors if the route does not exist.

## 7. Real-time with LiveView

LiveView lets you build real-time features without writing JavaScript. Here is a simple counter:

```elixir
defmodule BlogAppWeb.CounterLive do
  use BlogAppWeb, :live_view

  # Initialize state when the LiveView mounts
  def mount(_params, _session, socket) do
    {:ok, assign(socket, count: 0)}
  end

  # Handle click events from the browser
  def handle_event("increment", _params, socket) do
    {:noreply, update(socket, :count, &(&1 + 1))}
  end

  def handle_event("decrement", _params, socket) do
    {:noreply, update(socket, :count, &(&1 - 1))}
  end

  # Render the template
  def render(assigns) do
    ~H"""
    <div class="text-center">
      <h1 class="text-4xl font-bold"><%= @count %></h1>
      <div class="mt-4 space-x-4">
        <.button phx-click="decrement">-</.button>
        <.button phx-click="increment">+</.button>
      </div>
    </div>
    """
  end
end
```

Add the route:

```elixir
live "/counter", CounterLive
```

LiveView maintains a persistent WebSocket connection. When you click a button, it sends an event to the server, which updates state and pushes only the changed HTML back to the browser. No full page reload, no JavaScript state management.

## 8. Running in Production

Build a release for production deployment:

```bash
# Set environment variables
export SECRET_KEY_BASE=$(mix phx.gen.secret)
export DATABASE_URL="ecto://user:pass@localhost/blog_app_prod"

# Compile assets and build the release
MIX_ENV=prod mix assets.deploy
MIX_ENV=prod mix release

# Run migrations and start
_build/prod/rel/blog_app/bin/blog_app eval "BlogApp.Release.migrate"
_build/prod/rel/blog_app/bin/blog_app start
```

Phoenix releases are self-contained - no need to install Elixir on the production server.

---

Phoenix gives you Rails-like productivity with the performance characteristics typically associated with compiled languages. The learning curve is steeper if you are new to functional programming, but the payoff is a codebase that scales well and handles failure gracefully. Start with a small project, get comfortable with pattern matching and the pipe operator, and you will find Phoenix becomes surprisingly intuitive.
