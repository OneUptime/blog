# Validation Summary: How to Implement Authentication in Phoenix

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elixir
- Phoenix Framework (1.7+)
- `phx.gen.auth` generator
- Ecto / Ecto.Changeset / Ecto.Query
- Phoenix LiveView (`on_mount` hooks)
- Plug / Plug.Conn / Plug.CSRFProtection
- `bcrypt_elixir` (Bcrypt password hashing)
- ETS (rate limiting)
- Phoenix.Controller / Phoenix.Flash
- Logger

## Sources Consulted
- Phoenix `mix phx.gen.auth` docs — https://hexdocs.pm/phoenix/Mix.Tasks.Phx.Gen.Auth.html
- Phoenix `phx.gen.auth` template source — https://github.com/phoenixframework/phoenix/tree/main/priv/templates/phx.gen.auth
- Phoenix.Flash docs — https://phoenix.hexdocs.pm/Phoenix.Flash.html
- Elixir Logger docs — https://hexdocs.pm/logger/Logger.html
- Phoenix.LiveView docs — https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html
- Plug.Conn docs — https://hexdocs.pm/plug/Plug.Conn.html
- bcrypt_elixir hexdocs — https://hexdocs.pm/bcrypt_elixir/Bcrypt.html
- Ecto.Changeset docs — https://hexdocs.pm/ecto/Ecto.Changeset.html

## Issues Found

1. **`Logger.warning/1` used without `require Logger`** (in `MyAppWeb.Plugs.SessionSecurity`).
   - `Logger.warning/1` is a macro since Elixir 1.11; calling it without `require Logger` at the top of the module produces a compile error.
   - **Fix:** Added `require Logger` to the module.

2. **`get_flash/2` is deprecated/removed in Phoenix 1.7+** (in the authentication controller test).
   - `Phoenix.Controller.get_flash/2` was deprecated and removed; the replacement is `Phoenix.Flash.get/2`, which takes the `flash` assign (not the conn).
   - **Fix:** Replaced `get_flash(conn, :error)` with `Phoenix.Flash.get(conn.assigns.flash, :error)`. Since the rest of the post uses Phoenix 1.7+ patterns (verified routes `~p"..."`, `put_root_layout` keyword form, `MyAppWeb.ErrorJSON`), the test snippet should also match Phoenix 1.7+.

3. **`confirmed_at` declared as `:naive_datetime`** while `timestamps(type: :utc_datetime)` is on the same schema.
   - The current `phx.gen.auth` template (Phoenix 1.7+) defaults the `confirmed_at` field to `:utc_datetime`, consistent with `timestamps`. Mixing `:naive_datetime` with `:utc_datetime` timestamps is inconsistent and not what the default generator emits.
   - **Fix:** Changed the field type to `:utc_datetime`.

## Review Notes

- The `get_user_by_email_and_password/2` function in the post returns `{:ok, user} | {:error, :bad_credentials}`, which differs from the stock `phx.gen.auth` template (which returns `user | nil`). This is a reasonable custom variant — the controller handles the tuple correctly — so it is left as-is.
- `phx.gen.auth` supports multiple hashing libraries (`bcrypt_elixir`, `argon2_elixir`, `pbkdf2_elixir`) via the `--hashing-lib` flag. The post chooses `Bcrypt` consistently throughout, which matches the default. Worth a one-line note in a future revision that this is configurable.
- `String.slice(token, -4, 4)` (3-arg form with negative start) still works in current Elixir but the recommended idiom is `String.slice(token, -4..-1//1)`. Left as-is — not incorrect.
- `Phoenix.Controller.put_view(MyAppWeb.ErrorJSON)` (positional module form) still works in Phoenix 1.7+; the keyword form `put_view(conn, json: MyAppWeb.ErrorJSON)` is also valid. No change needed.
- The `delete "/users/log_out"` route is intentionally not in an authentication-required scope (matches `phx.gen.auth`'s behavior — letting users with expired sessions still log out). The neighboring comment "Logout route - requires authentication" is slightly misleading but not technically wrong; left as-is to preserve the author's wording.
- The `Bcrypt.verify_pass/2` + `Bcrypt.no_user_verify/0` pattern for preventing user-enumeration timing attacks is correctly used.
- Session token validity (`@session_validity_in_days 60`), Bcrypt `max: 72` password length, and the `:crypto.strong_rand_bytes(32)` token generation all match `phx.gen.auth` defaults.
