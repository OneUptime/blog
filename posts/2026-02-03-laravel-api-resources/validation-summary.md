# Validation Summary: How to Build APIs with Laravel Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PHP
- Laravel (Eloquent API Resources, JsonResource, ResourceCollection)
- Artisan CLI
- REST APIs (JSON)
- Carbon (date formatting)
- Mermaid (diagrams)
- PHPUnit (testing)

## Sources Consulted
- Laravel Eloquent API Resources documentation: https://laravel.com/docs/12.x/eloquent-resources
- Laravel Pagination documentation: https://laravel.com/docs/12.x/pagination
- Laravel Artisan documentation: https://laravel.com/docs/12.x/artisan
- Laravel Eloquent Relationships (eager loading, withCount/withAvg): https://laravel.com/docs/12.x/eloquent-relationships
- Laravel Requests (query helpers): https://laravel.com/docs/12.x/requests
- Carbon documentation: https://carbon.nesbot.com/docs/

## Issues Found
- Four section headers were missing their Markdown heading prefixes and rendered as plain paragraphs. Added the correct prefixes so the document outline is consistent with the rest of the post:
  - Line 116: `Resource Collections` → `## Resource Collections`
  - Line 789: `Resource Parameters and Context` → `## Resource Parameters and Context`
  - Line 859: `Resource Collections with Custom Logic` → `## Resource Collections with Custom Logic`
  - Line 1172 (inside "Complete Example: E-commerce API"): `Resources` → `### Resources` (matches the sibling `### Models` and `### Controller` headings)

All code samples, Artisan commands, method names (`whenLoaded`, `whenHas`, `whenCounted`, `when`, `mergeWhen`, `additional`, `with`, `resolve`, `withResponse`, `paginationInformation`, `JsonResource::withoutWrapping`), and pagination payload shape were verified against the current Laravel documentation and are correct.

## Review Notes
- The `ProductResource` uses `whenCounted('reviews', fn() => round($this->reviews_avg_rating, 1))` to expose the average rating only when the reviews count has been eager-loaded. This works because the example controller calls both `withCount('reviews')` and `withAvg('reviews', 'rating')`, but readers should know the gating is really on the count being present, not on the average. Laravel 10+ also provides `whenAggregated()` for aggregate-specific gating, which would be a more direct fit — kept as-is to avoid stylistic changes.
- The sparse-fieldset implementation relies on `$request->query('fields.articles')` resolving the nested query string `fields[articles]=...` via dot notation; this works in Laravel because `query()` uses `Arr::get()` under the hood.
- The post does not specify a Laravel version. The APIs shown are consistent with Laravel 9, 10, 11, and 12; no version-specific caveats need to be added.
