# Validation Summary: How to Use Mongoid Relations and Embeds in Rails

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoid (Ruby ODM for MongoDB)
- Ruby on Rails

## Sources Consulted
- Mongoid official documentation: https://www.mongodb.com/docs/mongoid/current/reference/associations/
- Mongoid embedded documents documentation: https://www.mongodb.com/docs/mongoid/current/reference/associations/#embedded-associations
- Mongoid source code (module structure): `Mongoid::Document` is the only document inclusion module
- MongoDB BSON document size limit documentation: https://www.mongodb.com/docs/manual/reference/limits/#BSON-Document-Size

## Issues Found
1. **`include Mongoid::EmbeddedDocument` does not exist** (appeared in both `Comment` and `SeoMeta` classes): Mongoid has no `Mongoid::EmbeddedDocument` module. All documents, whether top-level or embedded, must use `include Mongoid::Document`. The `embedded_in` macro is what designates a model as embedded, not a separate include module. Using `Mongoid::EmbeddedDocument` would raise a `NameError` at runtime. Changed both occurrences to `include Mongoid::Document`.

## Review Notes
- The recursive embedding example is correct but could mention the `recursively_embeds_many` / `recursively_embeds_one` shorthand macros that Mongoid provides as an alternative to the manual `embeds_many`/`embedded_in` with `class_name` approach.
- The guidance on when to embed vs. reference is sound and aligns with MongoDB schema design best practices.
- All other code examples (`embeds_many`, `embeds_one`, `embedded_in`, `has_many`, `belongs_to`, `has_and_belongs_to_many`, polymorphic relations, querying syntax) are correct.
