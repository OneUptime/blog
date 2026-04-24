# Validation Summary: How to Deploy a Rails + PostgreSQL Stack via Portainer - Postgres

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ruby on Rails
- PostgreSQL
- Redis
- Sidekiq
- Nginx
- Docker Compose
- Portainer

## Sources Consulted
- Ruby on Rails Guides, The Rails Command Line: https://guides.rubyonrails.org/command_line.html
- Ruby on Rails Guides, Configuring Rails Applications: https://guides.rubyonrails.org/configuring.html
- Ruby on Rails Guides, Active Record Migrations: https://guides.rubyonrails.org/active_record_migrations.html
- Ruby on Rails Guides, Action Cable Overview: https://guides.rubyonrails.org/action_cable_overview.html
- Ruby on Rails Guides, Active Storage Overview: https://guides.rubyonrails.org/active_storage_overview.html
- Docker Docs, Containerize a Ruby on Rails application: https://docs.docker.com/guides/ruby/containerize/
- Docker Docs, Control startup order in Compose: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs, Configs top-level element: https://docs.docker.com/reference/compose-file/configs/
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs, How Relative Path Support works in Portainer: https://docs.portainer.io/advanced/relative-paths
- NGINX Docs, WebSocket proxying: https://nginx.org/en/docs/http/websocket.html
- Sidekiq Wiki, Using Redis: https://sidekiq.org/wiki/Using-Redis

## Issues Found
- The Dockerfile precompiled assets with `SECRET_KEY_BASE=dummy`. I changed this to `SECRET_KEY_BASE_DUMMY=1` and set `RAILS_ENV=production` to match current Rails/Docker guidance for production asset precompilation.
- The Dockerfile referenced `bin/docker-entrypoint` as the image entrypoint but did not ensure it was executable. I added `RUN chmod +x bin/docker-entrypoint`.
- The entrypoint ran `db:migrate` and fell back to `db:setup`, which can mask real migration failures and is not the current Rails deployment pattern. I changed it to run `./bin/rails db:prepare` only when starting the Rails server.
- Because the same image is used for both `web` and `sidekiq`, the original entrypoint would also have attempted database setup from the Sidekiq container. The new conditional entrypoint prevents that unintended behavior.
- The Portainer instructions said to use the Web Editor, but the stack mounted `./nginx/rails.conf`, which is not self-contained for that workflow. I replaced the Nginx file bind mount with an inline config written at container startup so the stack can actually be pasted into Portainer’s Web Editor.
- The stack used `postgres://` URLs. I updated them to `postgresql://` to match Rails’ documented `DATABASE_URL` examples.
- The Sidekiq container did not mount the same `storage` volume as the web container, which would break Active Storage Disk-service jobs handled by background workers. I added the shared `active_storage` volume to `sidekiq`.
- The Redis comments and introduction implied Redis caching was configured automatically. I narrowed that language so it is only claimed when the Rails app is actually configured to use Redis as its cache store.
- The conclusion stated that Active Storage files persist in a named volume without qualification. I updated that statement to be accurate specifically for Active Storage’s Disk service.
- The tag `Ruby On Rail` was incorrect. I corrected it to `Ruby on Rails`.

## Review Notes
- Portainer’s current documentation validates much newer Docker releases than `20.10+`; the post’s prerequisite is not necessarily broken, but it is older than the versions Portainer currently lists as tested.
- Running Action Cable in the main Rails process, as shown here, is supported. Rails’ guide notes that a standalone cable server is generally preferred in production for larger deployments.
- Persisting Active Storage files in a Docker volume is appropriate for a single-host Disk-service deployment, but object storage is usually a better fit for multi-host or more elastic production setups.
