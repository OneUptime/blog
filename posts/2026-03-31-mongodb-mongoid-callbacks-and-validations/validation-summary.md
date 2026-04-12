# Validation Summary: How to Use Mongoid Callbacks and Validations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoid (Ruby ODM for MongoDB)
- Ruby on Rails (ActiveModel validations, ActiveSupport callbacks)

## Sources Consulted
- Mongoid official documentation — Callbacks: https://www.mongodb.com/docs/mongoid/current/reference/callbacks/
- Mongoid official documentation — Validations: https://www.mongodb.com/docs/mongoid/current/reference/validations/
- Mongoid official documentation — Atomic operations (`set`): https://www.mongodb.com/docs/mongoid/current/reference/persistence/#atomic
- Rails ActiveModel::Validations API documentation
- Rails ActiveSupport::Callbacks (`throw :abort` behavior since Rails 5.1)

## Issues Found

1. **Missing `body` field in Article model**: The `calculate_word_count` method called `body.to_s` and `archive_content` referenced `body`, but the Article model did not declare a `body` field. This would raise a `NoMethodError` under default Mongoid configuration (where `allow_dynamic_fields` is false). Fixed by adding `field :body, type: String` to the model.

2. **Incorrect "Skip all callbacks" example**: The post used `article.timeless.save` with the comment "Skip all callbacks". The `timeless` method in Mongoid only prevents timestamp fields (`created_at`/`updated_at`) from being updated — it does not skip callbacks. Replaced with `article.set(title: 'New Title')`, which performs an atomic update that bypasses the callback chain. Also clarified the comment on `save(validate: false)` to note that callbacks still run.

3. **Misleading claim about returning `false` to halt callbacks**: The post stated "Returning `false` (or `throw :abort` in Rails 5+) from a `before_*` callback halts the chain". In Mongoid 7+ (aligned with Rails 5.1+), returning `false` no longer halts the callback chain — only `throw(:abort)` works. Updated the text to reflect current behavior.

## Review Notes
- The list of supported callbacks mentions the "standard set" but omits `around_*` callbacks (`around_create`, `around_update`, `around_save`, `around_destroy`) and `before_upsert`/`after_upsert`/`around_upsert`. This is not incorrect since the post says "standard set" rather than "complete set", but readers may benefit from knowing about `around_*` callbacks in the future.
- The `generate_slug` method uses `chomp('-')` to strip a trailing hyphen but does not handle a leading hyphen (e.g., if the title starts with special characters). This is a code quality consideration rather than a technical error.
