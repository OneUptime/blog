# Validation Summary: How to Implement Multi-tenancy in Rails Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby on Rails 7.1
- PostgreSQL (schemas, databases, GIN/JSONB indexes)
- `acts_as_tenant` gem (shared-database multi-tenancy)
- `ros-apartment` gem (schema-based multi-tenancy)
- ActiveRecord (migrations, connection switching, `CurrentAttributes`)
- Sidekiq (server middleware, tenant-aware jobs)
- Redis (`redis_cache_store`)
- Devise, Pundit, RSpec, FactoryBot
- Nginx (wildcard subdomain config)

## Sources Consulted
- Rails 7.1 release notes — Active Job `:polynomially_longer` backoff and deprecation of `:exponentially_longer` (https://guides.rubyonrails.org/7_1_release_notes.html)
- Active Job Basics — `retry_on` / `wait` options (https://guides.rubyonrails.org/active_job_basics.html)
- `acts_as_tenant` gem README — `ActsAsTenant.current_tenant`, `without_tenant`, `ActsAsTenant::Errors::NoTenantSet` (https://github.com/ErwinM/acts_as_tenant)
- `ros-apartment` gem README — `Apartment.configure`, elevators, `Apartment::Tenant` API (https://github.com/rails-on-services/apartment)
- Active Support `CurrentAttributes` API (https://api.rubyonrails.org/classes/ActiveSupport/CurrentAttributes.html)
- Active Support Cache `RedisCacheStore` — `namespace` option (callable supported) (https://api.rubyonrails.org/classes/ActiveSupport/Cache/RedisCacheStore.html)
- Active Record connection handling / `establish_connection`, `connection_db_config` (https://api.rubyonrails.org/classes/ActiveRecord/ConnectionHandling.html)

## Issues Found
1. **Deprecated Active Job backoff option** — `SendProjectReportJob` used `retry_on StandardError, wait: :exponentially_longer, attempts: 3`. The `:exponentially_longer` symbol was deprecated in Rails 7.1 (it was actually polynomial, not exponential) and removed in Rails 7.2. Since the post targets Rails 7.1, changed it to the current `wait: :polynomially_longer`, which produces the same backoff curve without the deprecation warning.
2. **Duplicated hash key in cache configuration** — the `:redis_cache_store` options hash declared `namespace:` twice in the same literal (first a static string `'myapp_cache'`, then a per-request Proc). Ruby emits a "duplicated key" warning and the static value is dead code (silently overridden by the Proc). Removed the redundant static `namespace:` line, keeping only the tenant-aware Proc, which is the intended behavior. Adjusted the surrounding comment accordingly.

## Review Notes
- `TenantDatabaseService#run_migrations` passes `ActiveRecord::SchemaMigration` as the second argument to `ActiveRecord::MigrationContext.new(...)`. This is valid in Rails 7.1, but that second positional argument was deprecated in Rails 7.2 and removed later. Readers upgrading past 7.1 should drop it (`MigrationContext.new(paths).migrate`). Left as-is because it is correct for the stated Rails 7.1 target.
- The conceptual guidance is accurate: the three multi-tenancy approaches and their trade-offs, putting `tenant_id` first in composite indexes, scoping caches/jobs by tenant, and validating cross-tenant associations are all sound, idiomatic practices.
- `acts_as_tenant` and `ros-apartment` are both actively maintained and the correct gem choices for the shared-database and schema-based approaches respectively; the version constraints (`~> 1.0`, `~> 3.2`) are reasonable for the Rails 7.1 era.
- Minor stylistic note (not changed): several model/controller snippets reuse class names like `Task` across sections to illustrate different concerns; this is fine for a tutorial but would conflict if copied verbatim into one file.
