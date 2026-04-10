# Validation Summary: How to Use Redis for Rails Session Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Ruby on Rails
- redis-actionpack gem
- redis gem
- ActionDispatch session management

## Sources Consulted
- redis-actionpack gem documentation and source (https://github.com/redis-store/redis-actionpack)
- redis-store gem documentation (https://github.com/redis-store/redis-store)
- Rails ActionDispatch::Session documentation (https://api.rubyonrails.org/classes/ActionDispatch/Session.html)
- Rails `helper_method` API documentation (https://api.rubyonrails.org/classes/AbstractController/Helpers/ClassMethods.html#method-i-helper_method)
- Redis CLI documentation (https://redis.io/docs/latest/develop/tools/cli/)

## Issues Found
1. **`current_user` defined in wrong location**: The `current_user` method was defined in `ApplicationHelper` (a view helper module) but called from `ApplicationController#authenticate!`. Rails `helper_method` exports controller methods to views — it does not import view helper methods into the controller. Calling `current_user` from the controller would raise a `NoMethodError` at runtime. **Fix:** Moved `current_user` from `ApplicationHelper` into `ApplicationController` and removed the `ApplicationHelper` module, which is the standard Rails pattern for this use case.

## Review Notes
- The `redis-actionpack` gem is part of the `redis-store` ecosystem which has seen reduced maintenance activity. For newer Rails applications (5.2+), an alternative approach is to use `ActionDispatch::Session::CacheStore` with a Redis cache backend, or the `redis-session-store` gem. The approach shown in the post is still functional.
- The `Marshal.load` call in the manual session invalidation section is technically correct for deserializing redis-store session data, but `Marshal.load` on untrusted data is a well-known security risk. In this context the data comes from the application's own Redis store, so it is acceptable, but a production implementation should be cautious.
- The `redis-cli keys` command shown in the monitoring section works for debugging but should not be used in production on large datasets as it blocks the Redis server. The `SCAN` command is the production-safe alternative.
