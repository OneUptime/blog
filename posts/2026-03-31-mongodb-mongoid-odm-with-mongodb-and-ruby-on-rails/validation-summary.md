# Validation Summary: How to Use Mongoid ODM with MongoDB and Ruby on Rails

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoid 9.x (Ruby ODM)
- Ruby on Rails
- Ruby

## Sources Consulted
- Mongoid official documentation: https://www.mongodb.com/docs/mongoid/current/
- Mongoid Associations documentation: https://www.mongodb.com/docs/mongoid/current/reference/associations/
- Mongoid Data Modeling / Documents: https://www.mongodb.com/docs/mongoid/current/data-modeling/documents/
- Mongoid source code (GitHub): https://github.com/mongodb/mongoid
- MongoDB Ruby Driver TLS documentation: https://www.mongodb.com/docs/ruby-driver/current/security/tls/
- MongoDB Ruby Driver release notes: https://www.mongodb.com/docs/ruby-driver/upcoming/release-notes/

## Issues Found
1. **`Mongoid::EmbeddedDocument` does not exist** (Associations section, Comment class): The post used `include Mongoid::EmbeddedDocument`, which is not a valid module in any version of Mongoid. All document classes — whether top-level or embedded — must use `include Mongoid::Document`. The `embedded_in` macro is what designates a class as an embedded document. Using the non-existent module would raise a `NameError` at runtime. Changed to `include Mongoid::Document`.

## Review Notes
- The `ssl: true` option in the production mongoid.yml config is currently correct for Mongoid 9.x (Ruby driver 2.x), but MongoDB Ruby driver 3.0 will rename all `ssl`-prefixed options to `tls`-prefixed options. This is worth noting in a future update.
- The Scopes section defines a `recent` scope using `created_at`, but that section's class definition only includes `Mongoid::Document` without `Mongoid::Timestamps`. In a real application, `Mongoid::Timestamps` would need to be included for `created_at` to exist. This is acceptable as a focused code snippet demonstrating scope syntax, but could confuse beginners.
