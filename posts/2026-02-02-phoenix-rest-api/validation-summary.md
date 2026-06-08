# Validation Summary: How to Build REST APIs with Phoenix

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elixir
- Phoenix Framework (1.7+)
- Ecto / Ecto Changesets
- Guardian (JWT authentication library, ~> 2.3)
- bcrypt_elixir (~> 3.0)
- Erlang VM / BEAM
- REST APIs / JSON

## Sources Consulted
- Guardian Plug.VerifyHeader documentation: https://guardian.hexdocs.pm/Guardian.Plug.VerifyHeader.html
- Phoenix.Controller documentation: https://phoenix.hexdocs.pm/Phoenix.Controller.html
- Phoenix 1.7 release notes and generator documentation (mix phx.new, mix phx.gen.json)
- Ecto Changeset documentation (validate_format, validate_length, traverse_errors)
- bcrypt_elixir Hex package documentation

## Issues Found
No technical issues found.

The post accurately reflects Phoenix 1.7+ conventions:
- The `~p` verified routes sigil is correctly used
- `put_view(json: MyApiWeb.SomeJSON)` keyword-list syntax is correct
- The JSON module pattern (modules ending in `JSON` rather than `View`) is correct
- `action_fallback` usage is correct
- `mix phx.new --no-html --no-assets --no-live` flags are all valid
- `mix phx.gen.json Accounts User users ...` generator syntax is correct
- Guardian 2.x patterns are correct, including `Guardian.Plug.VerifyHeader, scheme: "Bearer"` (verified against official Guardian docs — `scheme:` is the documented option name)
- Guardian callbacks `subject_for_token/2` and `resource_from_claims/1` are correctly implemented
- `Guardian.encode_and_sign(user, %{}, ttl: {24, :hour})` is valid syntax
- Ecto changeset chain (cast, validate_required, validate_format, validate_length, unique_constraint) is correct
- `Ecto.Changeset.traverse_errors/2` with a translator function matches the standard Phoenix-generated pattern
- `Bcrypt.hash_pwd_salt/1` is the correct bcrypt_elixir API
- HTTP status code mappings to Plug atoms (`:ok`, `:created`, `:no_content`, `:unauthorized`, `:forbidden`, `:not_found`, `:unprocessable_entity`, `:internal_server_error`) are all accurate
- The router pipeline configuration with `Guardian.Plug.Pipeline`, `VerifyHeader`, `EnsureAuthenticated`, and `LoadResource` is the standard Guardian 2.x setup

## Review Notes
- The email regex `~r/^[^\s]+@[^\s]+$/` is very permissive (it does not require a `.` or TLD). This is intentionally noted by some Phoenix tutorials as a "good enough" baseline — strict email validation should be done by sending a verification email rather than via regex. This is technically correct but worth noting for readers expecting stricter validation.
- The `Accounts.authenticate_user/2` and `Accounts.get_user/1` functions referenced in the auth controller and Guardian module are not shown in the post — readers will need to implement these themselves. This is a reasonable pedagogical omission since the post focuses on the API/auth surface rather than the data layer plumbing.
- The post is consistent with Phoenix 1.7+ conventions; for older Phoenix versions (1.6 and earlier) the JSON view pattern, `put_view` syntax, and `~p` sigil would differ. Readers on older Phoenix should be aware.
- Guardian 2.3 and bcrypt_elixir 3.0 are valid versions as of the post's writing.
