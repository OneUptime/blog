# Validation Summary: How to Build a REST API with Ruby on Rails

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ruby 3.2
- Ruby on Rails 7.1
- Rails API-only applications
- Active Record models, migrations, validations, associations, and enums
- PostgreSQL configuration for Rails
- JWT authentication with the `jwt` Ruby gem
- BCrypt password hashing with `has_secure_password`
- Rails controllers, routing, concerns, and `rescue_from`
- RSpec request specs and FactoryBot factories
- Rack CORS middleware
- Rack::Attack rate limiting middleware

## Sources Consulted
- Ruby on Rails Guides: Using Rails for API-only Applications: https://guides.rubyonrails.org/api_app.html
- Ruby on Rails Guides: The Rails Command Line: https://guides.rubyonrails.org/command_line.html
- Ruby on Rails Guides: Active Record Validations: https://guides.rubyonrails.org/active_record_validations.html
- Rails API: ActiveRecord::Enum for Rails 7.1: https://api.rubyonrails.org/v7.1.6/classes/ActiveRecord/Enum.html
- Rails API: ActiveModel::SecurePassword::ClassMethods: https://api.rubyonrails.org/classes/ActiveModel/SecurePassword/ClassMethods.html
- ruby-jwt README and API usage: https://github.com/jwt/ruby-jwt
- Rack CORS README: https://github.com/cyu/rack-cors
- Rack::Attack README: https://github.com/rack/rack-attack
- OneUptime blog links and author/profile URLs referenced by the post: https://oneuptime.com and https://github.com/nawazdhandala

## Issues Found
- The JWT decode example used keyword-style options for `JWT.decode`. The `jwt` gem documents the decode signature with an explicit fourth options hash, so the example was changed to `JWT.decode(token, SECRET_KEY, true, { algorithm: 'HS256' })`.
- The post defined an `ExceptionHandler` concern early, then later introduced a separate `ErrorHandler` concern while `ApplicationController` still included `ExceptionHandler`. This made the documented validation error shape inconsistent with the request specs, which expected `json['error']['code'] == 'validation_failed'`. The later error handling example was changed to use the same `ExceptionHandler` module and include the authentication exceptions, and the earlier concern was updated to return the same structured error format.
- The error logging example called `exception.backtrace.first(10)`, which can fail if a backtrace is nil. It was changed to `Array(exception.backtrace).first(10).join("\n")` for a robust Rails error handler snippet.

## Review Notes
The post remains version-specific to Rails 7.1 and Ruby 3.2. Rails 8.x exists, but the Rails 7.1 APIs used here remain valid for the stated version. The snippets were reviewed for correctness against documentation, but they were not executed as a complete generated Rails application because the repository contains the blog post rather than the full tutorial project.
