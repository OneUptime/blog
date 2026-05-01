# Validation Summary: How to Deploy a Rails + PostgreSQL Stack via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- Ruby on Rails
- Puma
- PostgreSQL
- Docker health checks

## Sources Consulted
- Portainer Documentation: Add a new stack — https://docs.portainer.io/user/docker/stacks/add
- Portainer Documentation: Access a container's console — https://docs.portainer.io/2.33-lts/user/docker/containers/console
- Portainer Documentation: How Relative Path Support works in Portainer — https://docs.portainer.io/advanced/relative-paths
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Control startup and shutdown order in Compose — https://docs.docker.com/compose/how-tos/startup-order/
- Rails Guides: Active Record Migrations — https://guides.rubyonrails.org/active_record_migrations.html
- Rails Guides: The Rails Command Line — https://guides.rubyonrails.org/command_line.html
- Rails Guides: Configuring Rails Applications — https://guides.rubyonrails.org/configuring.html
- Rails Guides: Action Controller Overview (Rails 7.1) — https://guides.rubyonrails.org/v7.1/action_controller_overview.html
- Puma upstream README — https://github.com/puma/puma
- Puma DSL docs — https://puma.io/puma/Puma/DSL.html
- Rails generated `config/puma.rb` template — https://raw.githubusercontent.com/rails/rails/main/railties/lib/rails/generators/rails/app/templates/config/puma.rb.tt
- PostgreSQL 16 Documentation: `pg_isready` — https://www.postgresql.org/docs/16/app-pg-isready.html

## Issues Found
- The Compose snippet used the obsolete top-level `version` field. I removed it because current Docker Compose treats it as informational and obsolete.
- The PostgreSQL health check used `pg_isready -U rails` without targeting the configured database. I changed it to `pg_isready -U rails -d rails_production` to match the configured database and current Docker documentation patterns.
- The stack mounted `./app:/app`, which is not a generally valid Portainer stack pattern unless you are using Portainer's documented relative-path support for Git deployments. I changed it to an explicit host path (`/opt/rails-app:/app`) so the example matches a normal Portainer stack deployment.
- The web container startup command ran `db:create db:migrate db:seed` on every boot. I replaced it with `bundle exec rails db:prepare`, which Rails documents as the idempotent database setup task for repeatable startup flows.
- The Puma snippet used a worker boot hook that is no longer the preferred Puma naming and also referenced `ActiveRecord` inside a cluster hook without `preload_app!`, which Puma documents as a bad fit for application constants. I removed the hook block entirely; the current Rails-generated Puma template does not include it.
- The monitoring section claimed Rails `/up` detects database failures. Rails documents that `/up` does not reflect dependency status such as the database, so I corrected the wording to describe application boot checks only and to recommend a custom check for PostgreSQL-aware monitoring.
- The framework tag `Ruby On Rail` was incorrect. I corrected it to `Ruby on Rails`.

## Review Notes
- The updated stack is mechanically consistent with Portainer stack deployment, but it still assumes the Rails application code already exists on the host at `/opt/rails-app`.
- The built-in `/up` route is appropriate for Rails 7.1+ apps that still expose the default health check route. Older or customized apps may need an explicit route definition.
- `docker` is not installed in this workspace, so I could not run the stack or `docker compose config`. I validated the edited YAML snippets structurally and checked the behavior against the official documentation above.
