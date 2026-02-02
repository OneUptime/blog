# How to Build REST APIs with Phoenix

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Elixir, Phoenix, REST API, JSON, Web Development

Description: A practical guide to building RESTful APIs with Phoenix Framework, covering JSON rendering, authentication, validation, and API versioning.

---

Phoenix is an Elixir web framework that has gained serious traction for building APIs. Its speed comes from the Erlang VM, which was designed for telecom systems that need to handle millions of concurrent connections. If you need to build a REST API that scales well and handles high concurrency, Phoenix is worth considering.

In this guide, we will build a REST API from scratch, covering project setup, JSON controllers, validation with Ecto changesets, authentication with Guardian, and proper error handling.

## Creating an API-Only Phoenix Project

Phoenix ships with a flag specifically for API projects. This skips the HTML views, assets, and other browser-related stuff you do not need.

```bash
# Install Phoenix if you haven't already
mix archive.install hex phx_new

# Create a new API-only project
mix phx.new my_api --no-html --no-assets --no-live

cd my_api
mix deps.get
mix ecto.create
```

The `--no-html --no-assets --no-live` flags strip out everything related to browser rendering. You get a lean project focused purely on serving JSON.

## Setting Up a JSON Controller

Let's create a simple users API. First, generate the context and schema:

```bash
mix phx.gen.json Accounts User users email:string name:string password_hash:string
mix ecto.migrate
```

This generates a controller, view, and migration. Here is what the controller looks like:

```elixir
# lib/my_api_web/controllers/user_controller.ex
defmodule MyApiWeb.UserController do
  use MyApiWeb, :controller

  alias MyApi.Accounts
  alias MyApi.Accounts.User

  action_fallback MyApiWeb.FallbackController

  # GET /api/users
  def index(conn, _params) do
    users = Accounts.list_users()
    render(conn, :index, users: users)
  end

  # GET /api/users/:id
  def show(conn, %{"id" => id}) do
    user = Accounts.get_user!(id)
    render(conn, :show, user: user)
  end

  # POST /api/users
  def create(conn, %{"user" => user_params}) do
    with {:ok, %User{} = user} <- Accounts.create_user(user_params) do
      conn
      |> put_status(:created)
      |> put_resp_header("location", ~p"/api/users/#{user}")
      |> render(:show, user: user)
    end
  end

  # PUT /api/users/:id
  def update(conn, %{"id" => id, "user" => user_params}) do
    user = Accounts.get_user!(id)

    with {:ok, %User{} = user} <- Accounts.update_user(user, user_params) do
      render(conn, :show, user: user)
    end
  end

  # DELETE /api/users/:id
  def delete(conn, %{"id" => id}) do
    user = Accounts.get_user!(id)

    with {:ok, %User{}} <- Accounts.delete_user(user) do
      send_resp(conn, :no_content, "")
    end
  end
end
```

The JSON view handles serialization:

```elixir
# lib/my_api_web/controllers/user_json.ex
defmodule MyApiWeb.UserJSON do
  alias MyApi.Accounts.User

  def index(%{users: users}) do
    %{data: for(user <- users, do: data(user))}
  end

  def show(%{user: user}) do
    %{data: data(user)}
  end

  # Define what fields to expose in the API response
  defp data(%User{} = user) do
    %{
      id: user.id,
      email: user.email,
      name: user.name
      # Note: password_hash is deliberately excluded
    }
  end
end
```

## Validation with Ecto Changesets

Ecto changesets handle validation in Phoenix. They give you fine-grained control over what data is accepted:

```elixir
# lib/my_api/accounts/user.ex
defmodule MyApi.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  schema "users" do
    field :email, :string
    field :name, :string
    field :password_hash, :string
    field :password, :string, virtual: true

    timestamps()
  end

  @doc """
  Changeset for creating a new user.
  Validates required fields, email format, and password strength.
  """
  def changeset(user, attrs) do
    user
    |> cast(attrs, [:email, :name, :password])
    |> validate_required([:email, :name, :password])
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email")
    |> validate_length(:password, min: 8, message: "must be at least 8 characters")
    |> unique_constraint(:email)
    |> hash_password()
  end

  defp hash_password(changeset) do
    case get_change(changeset, :password) do
      nil -> changeset
      password -> put_change(changeset, :password_hash, Bcrypt.hash_pwd_salt(password))
    end
  end
end
```

When validation fails, the changeset captures errors. The FallbackController translates these into proper JSON responses.

## Authentication with Guardian

Guardian is the standard JWT library for Phoenix. Add it to your dependencies:

```elixir
# mix.exs
defp deps do
  [
    {:guardian, "~> 2.3"},
    {:bcrypt_elixir, "~> 3.0"}
  ]
end
```

Configure Guardian with your secret key:

```elixir
# lib/my_api/guardian.ex
defmodule MyApi.Guardian do
  use Guardian, otp_app: :my_api

  alias MyApi.Accounts

  # Encode the user ID into the token
  def subject_for_token(%{id: id}, _claims) do
    {:ok, to_string(id)}
  end

  # Decode the token back to a user
  def resource_from_claims(%{"sub" => id}) do
    case Accounts.get_user(id) do
      nil -> {:error, :resource_not_found}
      user -> {:ok, user}
    end
  end
end
```

Create an authentication controller:

```elixir
# lib/my_api_web/controllers/auth_controller.ex
defmodule MyApiWeb.AuthController do
  use MyApiWeb, :controller

  alias MyApi.Accounts
  alias MyApi.Guardian

  def login(conn, %{"email" => email, "password" => password}) do
    case Accounts.authenticate_user(email, password) do
      {:ok, user} ->
        # Generate a JWT token valid for 24 hours
        {:ok, token, _claims} = Guardian.encode_and_sign(user, %{}, ttl: {24, :hour})

        json(conn, %{token: token, user_id: user.id})

      {:error, :invalid_credentials} ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: "Invalid email or password"})
    end
  end
end
```

Add a pipeline to protect routes:

```elixir
# lib/my_api_web/router.ex
defmodule MyApiWeb.Router do
  use MyApiWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  pipeline :authenticated do
    plug Guardian.Plug.Pipeline,
      module: MyApi.Guardian,
      error_handler: MyApiWeb.AuthErrorHandler
    plug Guardian.Plug.VerifyHeader, scheme: "Bearer"
    plug Guardian.Plug.EnsureAuthenticated
    plug Guardian.Plug.LoadResource
  end

  # Public routes
  scope "/api", MyApiWeb do
    pipe_through :api

    post "/login", AuthController, :login
    post "/users", UserController, :create
  end

  # Protected routes
  scope "/api", MyApiWeb do
    pipe_through [:api, :authenticated]

    resources "/users", UserController, except: [:create]
  end
end
```

## Error Handling

A solid API needs consistent error responses. The FallbackController handles this:

```elixir
# lib/my_api_web/controllers/fallback_controller.ex
defmodule MyApiWeb.FallbackController do
  use MyApiWeb, :controller

  # Handle Ecto changeset errors (validation failures)
  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_status(:unprocessable_entity)
    |> put_view(json: MyApiWeb.ChangesetJSON)
    |> render(:error, changeset: changeset)
  end

  # Handle not found errors
  def call(conn, {:error, :not_found}) do
    conn
    |> put_status(:not_found)
    |> put_view(json: MyApiWeb.ErrorJSON)
    |> render(:"404")
  end

  # Handle unauthorized errors
  def call(conn, {:error, :unauthorized}) do
    conn
    |> put_status(:unauthorized)
    |> put_view(json: MyApiWeb.ErrorJSON)
    |> render(:"401")
  end
end
```

Format changeset errors as JSON:

```elixir
# lib/my_api_web/controllers/changeset_json.ex
defmodule MyApiWeb.ChangesetJSON do
  def error(%{changeset: changeset}) do
    %{errors: Ecto.Changeset.traverse_errors(changeset, &translate_error/1)}
  end

  defp translate_error({msg, opts}) do
    Enum.reduce(opts, msg, fn {key, value}, acc ->
      String.replace(acc, "%{#{key}}", fn _ -> to_string(value) end)
    end)
  end
end
```

## HTTP Status Codes Reference

Here are the status codes you should use in your API:

| Status Code | Atom | When to Use |
|-------------|------|-------------|
| 200 | :ok | Successful GET, PUT, PATCH |
| 201 | :created | Successful POST that creates a resource |
| 204 | :no_content | Successful DELETE |
| 400 | :bad_request | Malformed request syntax |
| 401 | :unauthorized | Missing or invalid authentication |
| 403 | :forbidden | Authenticated but not authorized |
| 404 | :not_found | Resource does not exist |
| 422 | :unprocessable_entity | Validation errors |
| 500 | :internal_server_error | Server-side errors |

## API Versioning

For production APIs, versioning helps you evolve without breaking clients:

```elixir
# lib/my_api_web/router.ex
scope "/api/v1", MyApiWeb.V1, as: :v1 do
  pipe_through [:api, :authenticated]
  resources "/users", UserController
end

scope "/api/v2", MyApiWeb.V2, as: :v2 do
  pipe_through [:api, :authenticated]
  resources "/users", UserController
end
```

## Testing Your API

Phoenix comes with excellent testing support. Here is a controller test:

```elixir
# test/my_api_web/controllers/user_controller_test.exs
defmodule MyApiWeb.UserControllerTest do
  use MyApiWeb.ConnCase

  alias MyApi.Accounts

  @valid_attrs %{email: "test@example.com", name: "Test User", password: "secretpass"}

  setup %{conn: conn} do
    {:ok, conn: put_req_header(conn, "accept", "application/json")}
  end

  describe "create user" do
    test "returns user when data is valid", %{conn: conn} do
      conn = post(conn, ~p"/api/users", user: @valid_attrs)

      assert %{"id" => id} = json_response(conn, 201)["data"]
      assert json_response(conn, 201)["data"]["email"] == "test@example.com"
    end

    test "returns errors when data is invalid", %{conn: conn} do
      conn = post(conn, ~p"/api/users", user: %{email: "bad"})

      assert json_response(conn, 422)["errors"] != %{}
    end
  end
end
```

Run your tests with `mix test`.

## Wrapping Up

Phoenix gives you a solid foundation for building REST APIs. The combination of pattern matching, Ecto changesets, and the actor model from the Erlang VM makes it a strong choice when you need both developer productivity and runtime performance.

The code in this guide should get you started with a production-ready API structure. From here, you can add features like rate limiting, request logging, and API documentation with OpenAPI specs.
