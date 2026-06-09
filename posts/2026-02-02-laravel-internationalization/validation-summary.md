# Validation Summary: How to Handle Internationalization in Laravel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Laravel (9+) localization system
- PHP (Carbon, NumberFormatter / intl extension)
- Blade templating (`__()`, `@lang`, `trans_choice()`)
- Spatie Laravel Translatable package
- PHPUnit (Feature and Unit tests)
- HTML / CSS (locale switcher, hreflang tags, XML sitemap)

## Sources Consulted
- Laravel official localization docs: https://laravel.com/docs/localization
- Laravel `lang:publish` artisan command: https://laravel.com/docs/localization#publishing-the-language-files
- Laravel directory structure (Laravel 9 release notes): https://laravel.com/docs/9.x/releases
- Laravel helpers (`lang_path()`, `resource_path()`, `base_path()`): https://laravel.com/docs/helpers
- Symfony Translation pluralization syntax (used by Laravel): https://symfony.com/doc/current/translation/message_format.html
- Spatie Laravel Translatable docs: https://github.com/spatie/laravel-translatable
- Carbon docs (`setLocale`, `translatedFormat`, `diffForHumans`): https://carbon.nesbot.com/docs/
- PHP NumberFormatter (intl extension): https://www.php.net/manual/en/class.numberformatter.php
- CLDR plural rules (Russian, Arabic): https://cldr.unicode.org/index/cldr-spec/plural-rules
- Google Search Central — hreflang: https://developers.google.com/search/docs/specialty/international/localized-versions

## Issues Found
- **Inconsistent language-file paths.** The post explicitly states that from Laravel 9 onward language files live in `lang/` at the project root (not `resources/lang/`), but two later code samples still used the legacy `resources/lang/` location. Fixed:
  - File-header comment `// resources/lang/en/validation.php` → `// lang/en/validation.php`.
  - File-header comment `// resources/lang/es/validation.php` → `// lang/es/validation.php`.
- **Wrong path helper in `TranslationCompletenessTest`.** The test built its language-file path with `resource_path("lang/{$locale}")`, which resolves to `resources/lang/...` and would not locate files on Laravel 9+. Replaced with `lang_path($locale)`, the helper introduced in Laravel 9 that resolves to the project-root `lang/` directory and matches the path convention used elsewhere in the post.

## Review Notes
- The middleware-registration example uses the Laravel 8/9/10 `app/Http/Kernel.php` style. This still works on those versions, but Laravel 11+ moved global/group middleware registration to `bootstrap/app.php` via `withMiddleware()`. Not incorrect — just worth noting for readers on Laravel 11+.
- `available_locales` is a custom config key the post introduces in `config/app.php`; it is not part of Laravel's built-in config. The post uses it consistently, so this is fine, but readers should be aware it is a user-defined convention.
- The `NumberHelper::percentage()` correctly divides by 100 before formatting, because `NumberFormatter::PERCENT` multiplies the value by 100 internally — a subtlety that is easy to get wrong.
- The Russian and Arabic plural-rule mermaid diagrams align with CLDR plural categories.
- The "18 / 10 characters between first and last letter" explanation for i18n / L10n is accurate (internationalization has 18 letters between "i" and "n"; localization has 10 between "l" and "n").
- The `SetLocale` middleware writes to the session on every request even when the locale came from the URL — intentional for persistence, but worth flagging as a design choice.
