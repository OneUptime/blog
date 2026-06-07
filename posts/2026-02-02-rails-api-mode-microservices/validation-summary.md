# Validation Summary: How to Build Microservices with Rails API Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby on Rails (API mode, `config.api_only`, `ActionController::API`)
- PostgreSQL (as the Rails database)
- Jbuilder (JSON view templates)
- ActiveModel Serializers (AMS)
- ruby-jwt (`JWT.encode` / `JWT.decode`)
- bcrypt (`has_secure_password` flow)
- Faraday 2.x and faraday-retry
- Sidekiq (gem mention)
- Redis (health check)
- Kubernetes (Deployment, liveness/readiness probes, DNS service discovery)
- Docker (Ruby 3.2-slim base image, bootsnap precompile)

## Sources Consulted
- Rails Guides: API-only applications — https://guides.rubyonrails.org/api_app.html
- Rails source for `ActionController::API` (no RequestForgeryProtection / CSRF) — confirms the comparison table
- ruby-jwt README and error class hierarchy (`JWT::DecodeError`, `JWT::ExpiredSignature`) — https://github.com/jwt/ruby-jwt
- Faraday 2.x documentation: built-in `:json` request/response middleware; `faraday-retry` extracted to a separate gem — https://lostisland.github.io/faraday/
- faraday-retry options (`max`, `interval`, `backoff_factor`, `exceptions`) — https://github.com/lostisland/faraday-retry
- ActiveModel Serializers 0.10 DSL (`attributes`, `attribute :name do ... end`, `belongs_to`, `has_many`) — https://github.com/rails-api/active_model_serializers
- redis-rb changelog: `Redis.current` deprecated in 4.6, removed in 5.0 — https://github.com/redis/redis-rb/blob/master/CHANGELOG.md
- Bootsnap `precompile --gemfile` CLI flag — https://github.com/Shopify/bootsnap
- Kubernetes DNS service discovery format `<svc>.<ns>.svc.cluster.local` — https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Deployment / probes API (`apps/v1`, `livenessProbe`, `readinessProbe.httpGet`) — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found

1. **`Redis.current.ping` no longer works on redis-rb 5.x.**
   - **What was wrong:** The health check used `Redis.current.ping == 'PONG'`. `Redis.current` was deprecated in redis-rb 4.6 (2021) and removed entirely in redis-rb 5.0 (2022). On any modern install (e.g., the post lists Sidekiq, and Sidekiq 7+ pulls redis-rb 5+), this code raises `NoMethodError: undefined method 'current' for Redis`.
   - **Fix:** Replaced with `Redis.new.ping == 'PONG'`, which works on current redis-rb versions and stays a minimal, single-line change that preserves the author's structure and tone.

## Review Notes

- **ActiveModel Serializers (AMS) is in maintenance mode.** The 0.10.x line is the last actively released series; the gem has not received feature work in years. It still functions and the DSL shown is correct, so it is presented (correctly) as one option. Authors of new microservices today often prefer alternatives like `jsonapi-serializer` (fka `fast_jsonapi`) or `alba`. Not changed because the post explicitly frames AMS as "Option 2" and the code is valid.
- **`bundle install --without development test`** in the Dockerfile is deprecated in Bundler 2.1+ (recommended form is `bundle config set --local without 'development test' && bundle install`). It still works and emits a warning, so it is not technically broken. Left as-is to avoid changing the author's deployment recipe.
- **`ActiveRecord::Base.connection.active?`** in the readiness probe only checks whether a connection object exists/is open, not whether the database is actually reachable. A `SELECT 1` query (e.g., `ActiveRecord::Base.connection.execute('SELECT 1')`) would be more rigorous. Not changed — the post's check is the conventional Rails idiom and works for the typical "is the process wired to a DB" liveness scenario.
- **Faraday 2.x assumption.** `conn.request :json` and `conn.response :json` are built into Faraday 2.x; in Faraday 1.x they required `faraday_middleware`. The Gemfile pins neither version, but the post is consistent with Faraday 2.x (separate `faraday-retry` gem), so this is internally coherent.
- **`JWT::ExpiredSignature` is a subclass of `JWT::DecodeError`,** so rescuing both is redundant but not incorrect — it is a common defensive style and was left alone.
- **`AuthController < ApplicationController` + `skip_before_action :authenticate_request, only: [:login]`** is correct; the parent has the `before_action` so the skip is meaningful.
- **CSRF table row** ("CSRF protection | Yes | No") is accurate: `ActionController::API` does not include `ActionController::RequestForgeryProtection`.
