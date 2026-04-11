# Validation Summary: How to Cache Rails Views and Fragments with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Ruby on Rails (fragment caching, collection caching, Russian doll caching)
- ERB templates
- ActiveRecord (cache key generation via `cache_key_with_version`)

## Sources Consulted
- Rails Guides — Caching with Rails: https://guides.rubyonrails.org/caching_with_rails.html
- Rails API — `ActionView::Helpers::CacheHelper#cache`: https://api.rubyonrails.org/classes/ActionView/Helpers/CacheHelper.html
- Rails API — `ActiveSupport::Cache::RedisCacheStore`: https://api.rubyonrails.org/classes/ActiveSupport/Cache/RedisCacheStore.html
- Rails API — `ActionView::Helpers::NumberHelper#number_to_currency`: https://api.rubyonrails.org/classes/ActionView/Helpers/NumberHelper.html#method-i-number_to_currency

## Issues Found

1. **Double dollar sign in `number_to_currency` output (line 99):** The code `$<%= number_to_currency(product.price) %>` would render as `$$100.00` because `number_to_currency` already prepends the `$` currency symbol by default. Removed the redundant `$` prefix so the line reads `<%= number_to_currency(product.price) %>`.

2. **Misleading section title "Action Caching with Low-Level API" (line 106):** "Action Caching" is a specific Rails concept (`caches_action`) that was removed from Rails core in Rails 4 and moved to the `actionpack-action_caching` gem. The code in this section uses `Rails.cache.fetch` (the low-level caching API) inside a controller, which is not action caching. Renamed the section to "Controller-Level Caching with Low-Level API" and updated the description to accurately reflect what the code does.

## Review Notes
- The `ActionController::Base.new.expire_fragment(...)` pattern in the "Sweeping Stale Fragments" section works but is a somewhat hacky approach. A cleaner alternative would be to use `Rails.cache.delete` with the appropriate key. This is not technically incorrect, so it was left as-is.
- `Rails.cache.delete_matched("products/*")` uses Redis `SCAN` under the hood in `RedisCacheStore`, which is correct but can be slow on large keyspaces. This is a valid approach but worth noting for production use.
- The post covers Rails 5.2+ patterns (`:redis_cache_store`, `cache_key_with_version`, collection caching with `cached: true`). All examples are current and non-deprecated.
