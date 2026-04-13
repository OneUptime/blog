# Validation Summary: How to Build a REST API with MongoDB and Rails

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Ruby on Rails (API mode)
- Mongoid ODM (~> 8.0)
- Kaminari (pagination)
- Ruby (URI::MailTo::EMAIL_REGEXP)

## Sources Consulted
- Mongoid 8.x official documentation: https://www.mongodb.com/docs/mongoid/current/
- Mongoid field definitions and index DSL: https://www.mongodb.com/docs/mongoid/current/reference/fields/
- Mongoid configuration reference: https://www.mongodb.com/docs/mongoid/current/reference/configuration/
- Rails API-only applications guide: https://guides.rubyonrails.org/api_app.html
- Rails strong parameters: https://guides.rubyonrails.org/action_controller_overview.html#strong-parameters
- Kaminari-mongoid gem: https://github.com/kaminari/kaminari-mongoid
- MongoDB ObjectId specification (12 bytes / 24 hex chars): https://www.mongodb.com/docs/manual/reference/bson-types/#objectid

## Issues Found

1. **Pagination default logic bug (controller `index` action)**: The original code used `limit = [[params[:limit].to_i, 1].max, 100].min` followed by `limit = 20 if limit == 0`. When `params[:limit]` is nil, `nil.to_i` evaluates to 0, then `[0, 1].max` yields 1, so limit is always >= 1 and the `== 0` fallback never triggers. This means requests without a `limit` parameter would return only 1 result per page instead of the intended default of 20. Fixed by using `params[:limit].present?` to check for the parameter before clamping, falling back to 20 when absent.

2. **Invalid MongoDB ObjectId in curl example**: The example ObjectId `64abc123def456789012345` contained only 23 hex characters. MongoDB ObjectIds are 12 bytes, represented as exactly 24 hexadecimal characters. Fixed to `64abc123def4567890123456` (24 characters).

## Review Notes
- The `background: true` option on the index definition is accepted by Mongoid but has been a no-op since MongoDB 4.2, where all index builds use an optimized non-blocking process. This is not incorrect but readers targeting MongoDB 4.2+ should be aware.
- The controller uses `.page(page).per(limit)` from Kaminari, but the Kaminari gem is introduced in a later section. Readers should ensure `kaminari-mongoid` is installed before the controller code will work.
- The `as_json(only: [...])` approach works but for larger APIs, a serializer library (e.g., Alba, Blueprinter) would be more maintainable. This is a style preference, not an error.
