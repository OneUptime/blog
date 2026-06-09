# Validation Summary: How to Implement GraphQL with Absinthe in Elixir

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elixir
- GraphQL
- Absinthe (`~> 1.7`)
- Absinthe Plug (`~> 1.5`)
- Absinthe Phoenix (`~> 2.0`)
- Phoenix Framework
- Phoenix Channels
- Ecto (for changeset error formatting)
- Plug

## Sources Consulted
- Absinthe official documentation: https://hexdocs.pm/absinthe/
- Absinthe Schema Notation docs: https://hexdocs.pm/absinthe/Absinthe.Schema.Notation.html
- Absinthe.Type.Custom: https://hexdocs.pm/absinthe/Absinthe.Type.Custom.html
- Absinthe.Plug: https://hexdocs.pm/absinthe_plug/Absinthe.Plug.html
- Absinthe.Plug.GraphiQL: https://hexdocs.pm/absinthe_plug/Absinthe.Plug.GraphiQL.html
- Absinthe.Phoenix.Socket: https://hexdocs.pm/absinthe_phoenix/Absinthe.Phoenix.Socket.html
- Absinthe.Subscription: https://hexdocs.pm/absinthe/Absinthe.Subscription.html
- Plug.Conn docs: https://hexdocs.pm/plug/Plug.Conn.html
- Ecto.Changeset.traverse_errors/2 docs: https://hexdocs.pm/ecto/Ecto.Changeset.html

## Issues Found

1. **`:datetime` scalar treated as built-in.** The original schema used `:datetime` in `UserTypes` without importing `Absinthe.Type.Custom`, and the scalar reference table listed `:datetime` alongside truly built-in scalars (`:id`, `:string`, `:integer`, `:float`, `:boolean`). The GraphQL spec only defines the latter five as built-in; Absinthe provides `:datetime`, `:naive_datetime`, `:date`, `:time`, and `:decimal` via the `Absinthe.Type.Custom` module which must be explicitly imported. As written, the example schema would fail to compile. **Fix:** Added `import_types Absinthe.Type.Custom` to the schema module, and updated the scalar reference table to mark which scalars are built-in vs. which require the `Absinthe.Type.Custom` import.

2. **Missing `import Plug.Conn` in the authentication middleware.** The `MyAppWeb.Plugs.GraphQLContext` module called `get_req_header(conn, "authorization")` but did not import or alias `Plug.Conn`, where `get_req_header/2` is defined. The module would fail to compile as written. **Fix:** Added `import Plug.Conn` to the plug module.

## Review Notes
- Dependency versions (`absinthe ~> 1.7`, `absinthe_plug ~> 1.5`, `absinthe_phoenix ~> 2.0`) are current and accurate as of the post's date.
- The `Absinthe.Plug.GraphiQL` interface options (`:simple`, `:advanced`, `:playground`) are correctly used; `:playground` is a valid choice.
- The `Absinthe.Subscription.publish/3` call signature with the keyword-list `[subscription_field: topic]` matches the documented API.
- The `use Absinthe.Phoenix.Socket, schema: MyAppWeb.Schema` directive is correct for wiring up subscription transport over Phoenix Channels.
- The resolver `format_errors/1` helper using `Ecto.Changeset.traverse_errors/2` matches the idiomatic pattern documented in the Ecto docs.
- The `Absinthe.Plug.put_options(conn, context: context)` call is the documented way to attach context for downstream resolvers.
- Minor stylistic note (not fixed): the `update_user` resolver's `with` block has a subtle behavior — when `Accounts.get_user/1` returns `nil`, the `with` clause `user when not is_nil(user) <- ...` fails and the `else` clause's `nil ->` branch matches the original `nil` return. This is correct Elixir but is a slightly advanced pattern for a tutorial reader.
