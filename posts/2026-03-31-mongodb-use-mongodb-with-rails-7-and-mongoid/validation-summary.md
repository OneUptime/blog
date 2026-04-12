# Validation Summary: How to Use MongoDB with Rails 7 and Mongoid

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Ruby on Rails 7
- Mongoid 8.x (MongoDB ODM for Ruby)

## Sources Consulted
- Mongoid Configuration Reference: https://www.mongodb.com/docs/mongoid/current/reference/configuration/
- Mongoid database rake tasks source: https://github.com/mongodb/mongoid/blob/master/lib/mongoid/tasks/database.rake
- Mongoid railties database rake tasks: https://github.com/mongodb/mongoid/blob/master/lib/mongoid/railties/database.rake
- Mongoid PR #4386 (closed, never merged — proposed `db:mongoid:list_indexes`): https://github.com/mongodb/mongoid/pull/4386
- MongoDB Ruby Driver TLS documentation: https://www.mongodb.com/docs/ruby-driver/current/security/tls/

## Issues Found
- **`rails db:mongoid:list_indexes` does not exist.** The blog post listed `rails db:mongoid:list_indexes` as a standard rake task for listing indexes. This task was never implemented in Mongoid (a PR to add it, #4386, was closed without merging). Replaced with `rails db:mongoid:remove_undefined_indexes`, which is a real Mongoid rake task that helps manage indexes by removing ones in the database that are no longer defined in models.

## Review Notes
- The `ssl: true` option in the production YAML config is correct for Mongoid 8.x, which uses the Ruby MongoDB driver 2.x. The `ssl`-prefixed option names are the current standard; `tls`-prefixed names are planned for Ruby driver 3.0.
- The post advises removing `gem 'activerecord'` from the Gemfile but does not mention that `config/application.rb` may also need to be updated to not require `active_record/railtie`. For a new app, `rails new myapp --skip-active-record` would be the cleanest approach. This is a minor omission, not an error.
- All Mongoid model definitions, field types, associations, scopes, validations, and query methods (`lte`, `inc`, `only`, `find_by`) are correct.
- The `mongoid.yml` configuration structure and options are accurate for Mongoid 8.x.
