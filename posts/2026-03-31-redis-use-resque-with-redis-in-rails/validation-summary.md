# Validation Summary: How to Use Resque with Redis in Rails

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Ruby on Rails
- Resque (background job library)
- Ruby
- Rake

## Sources Consulted
- Resque GitHub repository and README: https://github.com/resque/resque
- Resque wiki (hooks documentation): https://github.com/resque/resque/wiki/Hooks
- Resque API documentation for `Resque.redis=` assignment
- Redis-namespace gem: https://github.com/resque/redis-namespace
- Resque::Server (built-in web UI) source and documentation

## Issues Found

1. **Unnecessary `resque-web` gem in Gemfile**: The post included `gem "resque-web", require: false` in the Gemfile but later mounted `Resque::Server` (which ships with the `resque` gem itself) in routes. The `resque-web` gem is a separate standalone Sinatra application and is not needed when mounting `Resque::Server` directly in Rails routes. Removed the extra gem line.

2. **Incorrect `Redis.new` configuration with `namespace` option**: The configuration passed `namespace: "resque"` as an option to `Redis.new`, but `Redis.new` does not accept a `namespace` parameter. Resque accepts a Redis URL string directly via `Resque.redis =`, which internally wraps it in a `Redis::Namespace` object. Changed to pass the URL string directly to `Resque.redis`, which is the standard and documented approach. The subsequent `Resque.redis.namespace = "resque:myapp"` line then correctly sets the namespace.

3. **Non-existent `Resque::Plugins::Hooks` module**: The `NotificationJob` example used `extend Resque::Plugins::Hooks`, but this module does not exist in Resque. Resque hooks are built-in and work by naming convention alone — defining methods like `before_perform_*` and `after_perform_*` on the job class is sufficient. No module needs to be extended. Removed the `extend` line.

4. **Incorrect `Resque.working` method call**: The queue status checking code used `Resque.working.count`, but the correct API is `Resque::Worker.working.count`. There is no `Resque.working` class method. Fixed to use the correct `Resque::Worker.working` call.

## Review Notes
- The `UserMailer.send(template, user, variables)` pattern uses Ruby's `Object#send` for dynamic dispatch. While technically functional, `public_send` would be safer to prevent calling private methods. Left as-is since it works correctly and is a style/security consideration rather than a bug.
- The `authenticate :user` block in the routes example assumes Devise is being used. This is a reasonable assumption for a Rails app but could be noted for readers using other authentication solutions.
- The post correctly describes Resque's process-based architecture vs. Sidekiq's thread-based model.
