# Validation Summary: How to Build a REST API with Phoenix Framework

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Elixir
- Phoenix Framework
- Ecto
- PostgreSQL
- Guardian JWT authentication
- Phoenix controllers and routing
- ExUnit and ConnCase testing

## Sources Consulted
- Phoenix `mix phx.new` documentation: https://hexdocs.pm/phoenix/Mix.Tasks.Phx.New.html
- Phoenix `mix phx.gen.schema` documentation: https://hexdocs.pm/phoenix/Mix.Tasks.Phx.Gen.Schema.html
- Phoenix controllers guide: https://hexdocs.pm/phoenix/controllers.html
- Phoenix routing guide and verified routes documentation: https://hexdocs.pm/phoenix/routing.html
- Phoenix custom error pages documentation: https://hexdocs.pm/phoenix/custom_error_pages.html
- Phoenix.Controller API documentation: https://hexdocs.pm/phoenix/Phoenix.Controller.html
- Ecto.Changeset documentation: https://hexdocs.pm/ecto/Ecto.Changeset.html
- Ecto.Migration documentation: https://hexdocs.pm/ecto_sql/Ecto.Migration.html
- Guardian documentation: https://hexdocs.pm/guardian/Guardian.html
- Guardian secret generator documentation: https://hexdocs.pm/guardian/Mix.Tasks.Guardian.Gen.Secret.html

## Issues Found
- The feature table overstated BEAM/Phoenix concurrency and described hot code reloading as a deployment mechanism. Updated those claims to describe lightweight BEAM concurrency and development code reloading more accurately.
- The project structure diagram used `views/`, which is outdated for current Phoenix JSON examples. Updated it to refer to JSON modules.
- The tutorial created tasks with a `user_id` foreign key but did not state that a `users` table and `TaskApi.Accounts.User` schema must exist first. Added that prerequisite before the task schema generator command.
- The task changeset cast `user_id` during both create and update operations, allowing an update request to reassign a task to another user. Split task creation into `create_changeset/2` and kept normal updates from casting `user_id`.
- The controller generated a `Location` header with `~p"/api/tasks/#{task}"`. Changed this to `task.id` so the verified route interpolates the route path segment directly.
- The Guardian configuration used a hardcoded fallback secret. Changed the example to read `GUARDIAN_SECRET_KEY` from runtime configuration with `System.fetch_env!/1`.
- The test examples used `insert(:user)` and `insert(:task)` without explaining that these are factory helpers. Added a note that a factory library such as ExMachina, or equivalent direct context setup, is required.

## Review Notes
- Local Elixir and Mix commands could not be run because `elixir` and `mix` are not installed in this workspace. CLI and API checks were performed against official Phoenix, Ecto, and Guardian documentation instead.
- The article still assumes surrounding account registration/login code exists, but the new prerequisite note makes that dependency explicit.
