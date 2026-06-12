# Validation Summary: How to Use Rails Concerns for Code Reuse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby on Rails
- ActiveSupport::Concern
- Active Record models, scopes, callbacks, migrations, and associations
- Action Controller concerns and API controllers
- RSpec
- JWT authentication
- Mermaid diagrams

## Sources Consulted
- Rails API: ActiveSupport::Concern - https://api.rubyonrails.org/classes/ActiveSupport/Concern.html
- Rails API: ActionController::API - https://api.rubyonrails.org/classes/ActionController/API.html
- Rails API: ActionController helper_method - https://api.rubyonrails.org/classes/AbstractController/Helpers/ClassMethods.html
- Rails API: ActionController::Helpers - https://api.rubyonrails.org/classes/ActionController/Helpers.html
- Rails API: ActiveRecord::Persistence - https://api.rubyonrails.org/v8.1.3/classes/ActiveRecord/Persistence.html
- Rails API: ActiveRecord::Sanitization::ClassMethods - https://api.rubyonrails.org/classes/ActiveRecord/Sanitization/ClassMethods.html
- Rails API: ActiveRecord::Scoping::Default::ClassMethods - https://api.rubyonrails.org/classes/ActiveRecord/Scoping/Default/ClassMethods.html
- Rails Guides: Active Record Callbacks - https://guides.rubyonrails.org/active_record_callbacks.html

## Issues Found
- The search concern was described as adding full-text search, but the example used a case-insensitive substring query with PostgreSQL `ILIKE`, not a full-text-search implementation. Changed the description to "case-insensitive search."
- The search concern interpolated column names directly and did not escape SQL LIKE wildcards in the query. Updated the example to use `connection.quote_column_name` for declared columns and `sanitize_sql_like` for user input.
- The soft-delete concern overrode `destroy` without preserving Rails destroy semantics, which would skip normal destroy lifecycle behavior such as callbacks, dependent association handling, destroyed state, and freezing. Removed that override and clarified that `soft_delete` / `soft_delete!` should be called explicitly while standard `destroy` remains a real destroy.
- The controller concern used `respond_to` and `helper_method` in an `ActionController::API` base controller, but `ActionController::API` is intentionally lightweight and does not include all full-stack controller modules by default. Updated the API base controller example to include `ActionController::MimeResponds` and `ActionController::Helpers`.
- The authentication concern accessed `session` in an API-controller context where session support may not be configured. Added a `respond_to?(:session, true)` guard before reading `session[:user_id]`.
- The dependency concern example placed dependent `include` calls inside an `included` block. Updated it to include dependencies directly in the concern body, matching the Rails `ActiveSupport::Concern` dependency pattern.

## Review Notes
The post is now technically sound as a Rails concern tutorial. The search example remains PostgreSQL-specific because it uses `ILIKE`; a future improvement could call that out explicitly or show a database-neutral alternative. Ruby syntax checks were not run because `ruby` is not installed in the review environment.
