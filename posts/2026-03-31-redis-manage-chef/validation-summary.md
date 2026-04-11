# Validation Summary: How to Manage Redis with Chef

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.2.0
- Chef Infra (cookbooks, recipes, environments, custom resources)
- `redisio` community cookbook (Chef Supermarket)
- Berkshelf (dependency management)
- Test Kitchen with Vagrant driver
- InSpec (integration testing)
- Knife CLI (deployment and node management)

## Sources Consulted
- Chef Infra documentation on environment files: https://docs.chef.io/environments/
- Chef Infra documentation on custom resources: https://docs.chef.io/custom_resources/
- Chef Infra documentation on attributes and precedence: https://docs.chef.io/attributes/
- `redisio` cookbook on Chef Supermarket: https://supermarket.chef.io/cookbooks/redisio
- Chef Test Kitchen documentation: https://kitchen.ci/
- InSpec resource reference: https://docs.chef.io/inspec/resources/
- Knife CLI reference: https://docs.chef.io/knife/

## Issues Found

### 1. `node` object used in environment file (Critical)
- **What was wrong:** In the `environments/production.rb` example, `node['redis']['password']` was used inside the `override_attributes` block to set `requirepass`. Chef environment files are evaluated statically and do not have access to the `node` object. This would raise a `NameError` at parse time.
- **What was changed:** Replaced `node['redis']['password']` with the literal password string `'StrongProductionPassword123!'` to match the value already defined in the same environment file.
- **Why:** Environment files in Chef are parsed independently of a Chef client run and cannot reference `node` attributes. Attribute cross-references must happen in recipes, not in environment definitions.

### 2. Outdated "LWRP" terminology (Minor)
- **What was wrong:** The section title "Create a Custom Redis LWRP" used the term LWRP (Lightweight Resource Provider), which refers to a deprecated Chef pattern. The actual code in the section uses the modern Custom Resource syntax (`unified_mode`, `property`, `action` blocks), introduced in Chef 12.5+ and refined through Chef 15+.
- **What was changed:** Renamed the section title from "Create a Custom Redis LWRP" to "Create a Custom Redis Resource".
- **Why:** The LWRP pattern (separate files in `resources/` and `providers/`) was deprecated in favor of Custom Resources. Using the correct terminology prevents confusion for readers learning modern Chef.

## Review Notes
- The `redisio` cookbook version constraint `~> 3.0` in the Berksfile may need updating depending on when the reader uses this guide. Readers should check the Chef Supermarket for the latest version.
- The basic recipe references `node['redis']['password']` (line 39), which depends on the attribute being set externally (e.g., via an environment or role). This is a valid pattern but could confuse beginners if they run the recipe without setting that attribute first.
- The Test Kitchen InSpec test checks `service('redis-server')`, which is the standard service name from apt/yum-installed Redis. If using the `redisio` cookbook, the service name typically follows a different pattern (e.g., `redis6379`). The test would need to be adjusted depending on the installation method used.
- Storing passwords in plain text in environment files (as shown in the production environment example) is not recommended for production use. The post does mention using Data Bags for secrets in the custom resource section, which is the better approach.
- The `knife bootstrap` command uses `-r` (shorthand for `--run-list`) and `-E` (shorthand for `--environment`), both of which are valid flags in current versions of Chef Workstation.
