# Validation Summary: How to Implement API Authentication with JWT in Rails

## Status
validated

## Post Type
Tutorial / Guide (step-by-step implementation walkthrough)

## Technologies Covered
- Ruby on Rails (API mode, Rails 7.0 migration syntax)
- JWT (`jwt` gem)
- bcrypt / `has_secure_password`
- Redis (`redis` gem 5.x) for refresh-token storage, rotation, and blacklisting
- RSpec (request and service specs)
- Rack middleware (security headers)

## Sources Consulted
- ruby-jwt gem documentation and source — https://github.com/jwt/ruby-jwt (encode/decode signatures, `verify_expiration`, exception hierarchy where `JWT::ExpiredSignature` and `JWT::VerificationError` subclass `JWT::DecodeError`)
- redis-rb 5.x documentation — https://github.com/redis/redis-rb (`Redis#multi` block form, `hset` with multiple field/value pairs, `exists?`, `scan_each`, `setex`)
- Rails Routing guide — https://guides.rubyonrails.org/routing.html (`namespace` vs path `scope` and how `to:` controller strings inherit module nesting)
- Rails `has_secure_password` / ActiveModel::SecurePassword docs — https://api.rubyonrails.org/classes/ActiveModel/SecurePassword/ClassMethods.html (`authenticate` returns the record or `false`)
- RFC 7519 (JWT) — standard claims `exp`, `iat`, `jti`, `sub`

## Issues Found
- **Routes mapped to the wrong controller (fixed).** The original `config/routes.rb` wrapped the auth endpoints in `namespace :auth do ... post 'login', to: 'auth#login' ... end`. Because `namespace` adds a module prefix, this resolves the `to:` target to `Api::V1::Auth::AuthController`, while the controller actually defined in the post is `Api::V1::AuthController` (`app/controllers/api/v1/auth_controller.rb`). This would raise an uninitialized-constant/routing error at boot or request time. Replaced the inner `namespace :auth` block with path-scoped routes (`post 'auth/login', to: 'auth#login'`, etc.) so the URLs stay `/api/v1/auth/...` and map to the existing `Api::V1::AuthController`, matching the controller's own endpoint comments.

## Review Notes
- `X-XSS-Protection: 1; mode=block` is included in the security-headers middleware. This header is deprecated and modern guidance (OWASP) recommends omitting it or setting it to `0` in favor of a Content-Security-Policy. It is not harmful for a JSON API and the post scopes it "for any HTML responses," so it was left as-is, but readers building new apps can safely drop it.
- The `rescue JWT::ExpiredSignature` clause is correctly ordered before `rescue JWT::DecodeError` (the former is a subclass), so expired tokens get the dedicated "Token has expired" message — verified correct.
- The login action generates a token pair via `JwtService.create_token_pair` but then discards `tokens[:refresh_token]` and uses the refresh token from `RefreshTokenService.create` instead. This is a minor redundancy (an extra unused refresh token is encoded), not a correctness bug; left unchanged.
- The request spec hits `GET /api/v1/users/me`, which under `resources :users, only: [:show, :update]` matches `show` with `id = "me"`. The `UsersController` is not shown in the post, so this is illustrative; no change made.
- Redis is used by both the test-illustrated services and the request specs; running the integration specs as written requires a live Redis instance. This is an environment consideration, not a code error.
