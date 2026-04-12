# Validation Summary: How to Use MongoDB with Sinatra

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Sinatra (Ruby web framework)
- Mongoid ~> 8.0 (ODM for MongoDB)
- mongo gem (official MongoDB Ruby driver)
- Ruby
- Bundler

## Sources Consulted
- Mongoid 8.0 Release Notes: https://www.mongodb.com/docs/mongoid/8.1/release-notes/mongoid-8.0/
- Mongoid Persistable::Updatable API docs: https://www.rubydoc.info/github/mongoid/mongoid/Mongoid/Persistable/Updatable
- MongoDB Ruby Driver - Create a Client: https://www.mongodb.com/docs/ruby-driver/current/reference/create-client/
- Mongoid Configuration docs: https://www.mongodb.com/docs/mongoid/current/reference/configuration/
- Sinatra-contrib (sinatra/json) docs: https://github.com/sinatra/sinatra-contrib

## Issues Found
1. **`update_attributes!` deprecated in Mongoid 8.x**: In the PATCH `/items/:id` route, the code used `item.update_attributes!(...)`. While this still functions as an alias in Mongoid 8.x, it is deprecated in favor of `update!`. Changed to `item.update!(data.slice('name', 'price', 'in_stock'))`.

## Review Notes
- The `rescue nil` on `Item.find_by(id: params[:id])` is unnecessary since `find_by` returns `nil` by default when no document is found (unlike `find` which raises `Mongoid::Errors::DocumentNotFound`). However, it is harmless and provides a safety net if `raise_not_found_error` config is changed.
- The `mongoid.yml` uses `default` as the environment name (passed as `:default` to `Mongoid.load!`). This is valid but unconventional — most projects use `development`, `production`, etc. Fine for a tutorial.
- The PATCH route uses `update!` which raises on validation failure, resulting in a 500 error. A production app would want error handling, but this is acceptable for a tutorial.
- The raw driver alternative section correctly shows `Mongo::Client.new` with a URI string and options hash.
