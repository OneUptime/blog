# Validation Summary: How to Build REST APIs with Ruby on Rails

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby
- Ruby on Rails API-only applications
- Active Record models, validations, associations, and scopes
- Rails routing and controllers
- jsonapi-serializer
- JWT authentication with the ruby-jwt gem
- RSpec request specs
- rack-attack rate limiting
- Kaminari pagination
- PostgreSQL

## Sources Consulted
- Ruby on Rails Guides: Using Rails for API-only Applications: https://guides.rubyonrails.org/api_app.html
- Ruby on Rails Guides: The Rails Command Line: https://guides.rubyonrails.org/command_line.html
- Ruby on Rails Guides: Active Record Validations: https://guides.rubyonrails.org/active_record_validations.html
- Ruby on Rails API: Rails::Application#secret_key_base: https://api.rubyonrails.org/classes/Rails/Application.html
- jsonapi-serializer official README: https://github.com/jsonapi-serializer/jsonapi-serializer
- ruby-jwt API documentation: https://ruby-jwt.org/JWT.html
- rack-attack official README: https://github.com/rack/rack-attack
- Kaminari documentation: https://www.rubydoc.info/gems/kaminari
- RSpec Rails request specs documentation: https://rspec.info/features/rspec-rails/request-specs/request-spec/

## Issues Found
- The controller used Kaminari pagination methods (`page`, `per`, `current_page`, `total_pages`, and `total_count`) without adding the Kaminari gem. Added `gem 'kaminari'` before the controller example so the pagination API is available.
- The Post scaffold command omitted `user:references`, but later examples rely on `Post` belonging to a `User` and on `current_user.posts.build`. Updated the scaffold command to generate the user reference.
- The serializer referenced `UserSerializer`, which would raise an undefined constant error unless a separate `UserSerializer` had already been defined. Changed the relationship to `belongs_to :user`, matching the documented jsonapi-serializer association syntax.
- The JWT example used the `JWT` constant without adding the ruby-jwt gem. Added `gem 'jwt'`.
- The JWT example read `Rails.application.credentials.secret_key_base` directly. Updated it to `Rails.application.secret_key_base`, Rails' public accessor that resolves the secret from the configured sources.
- The authentication sequence diagram called the authentication layer middleware, but the sample implementation is a controller concern invoked with `before_action`. Renamed it to `Auth Concern`.
- The rate-limiting example used `Rack::Attack` without adding the gem. Added `gem 'rack-attack'`.

## Review Notes
The snippets are intentionally concise and still assume surrounding application pieces such as a `User` model, token generation for login, factories, and comments resources. Those assumptions are reasonable for a guide, but a future revision could call them out explicitly.
