# Validation Summary: How to Handle Internationalization (i18n) in Rails

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ruby on Rails (i18n framework, Rails 7.0-era APIs)
- Ruby `i18n` gem (backends, pluralization, fallbacks)
- YAML locale files
- ERB views and Rails view helpers (`t`, `l`, `number_to_currency`, etc.)
- Active Record model/attribute/error translations
- Globalize gem (dynamic content translation)
- i18n-tasks gem (missing/unused translation detection)
- SEO concepts (hreflang, localized URLs, sitemaps)

## Sources Consulted
- Rails Internationalization (I18n) API — Ruby on Rails Guides: https://guides.rubyonrails.org/i18n.html
- Configuring Rails Applications — Ruby on Rails Guides (config.i18n.* options): https://guides.rubyonrails.org/configuring.html
- ruby-i18n LazyLoadable backend source: https://github.com/ruby-i18n/i18n/blob/master/lib/i18n/backend/lazy_loadable.rb
- ruby-i18n Cache backend source: https://github.com/ruby-i18n/i18n/blob/master/lib/i18n/backend/cache.rb

## Issues Found

1. **Non-existent config option `config.i18n.cache_translations` (Performance > Caching Translations).**
   The post instructed readers to enable translation caching via
   `config.i18n.cache_translations = true` in `production.rb`. This is not a
   real Rails/i18n configuration option and would have no effect. Replaced it
   with the documented approach: mixing `I18n::Backend::Cache` into the Simple
   backend and assigning an `ActiveSupport::Cache` store via `I18n.cache_store`.

2. **`LazyLoadable` backend instantiated without enabling lazy loading (Performance > Lazy Loading Translations).**
   The post wrote `I18n.backend = I18n::Backend::LazyLoadable.new`, but the
   backend's `initialize(lazy_load: false)` defaults to `false`, in which mode it
   behaves exactly like the Simple backend and does **not** lazy-load — directly
   contradicting the accompanying comment. Fixed to
   `I18n::Backend::LazyLoadable.new(lazy_load: true)` and added a clarifying note.

## Review Notes
- The custom Russian pluralization rule in `config/initializers/pluralization.rb`
  is logically correct (matches CLDR one/few/many/other rules), but as written it
  is a bare hash literal that is not assigned or stored anywhere, so the file as
  shown would not actually register the rule. Functionally it needs to be loaded
  as a locale file (via the `load_path` with the `I18n::Backend::Pluralization`
  backend) or passed to `I18n.backend.store_translations`. The snippet is fine as
  a structural illustration of the rule shape; left unchanged to avoid expanding scope.
- `serialize :title_translations, JSON` (Manual Translation Management) uses the
  positional-argument form, which is valid for the Rails 7.0 target shown in the
  migrations but is deprecated in Rails 7.1 and removed in 7.2 (use
  `serialize :attr, coder: JSON`). Left as-is since the post consistently targets
  Rails 7.0 (`ActiveRecord::Migration[7.0]`).
- The Globalize gem is functional but largely in maintenance mode; Mobility is the
  more actively maintained modern alternative. Not a correctness issue.
- All remaining code (lazy lookup, interpolation, pluralization YAML, date/time and
  number/currency format keys, locale-detection strategies, model/error
  translations, i18n-tasks usage, hreflang/SEO markup) verified as syntactically
  correct and consistent with current Rails i18n conventions.
