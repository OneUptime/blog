# Validation Summary: How to Build Multi-Language Applications in Laravel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Laravel (10/11+)
- PHP 8.x
- Blade templating
- Carbon (date library)
- PHP intl extension (NumberFormatter)
- Eloquent migrations
- Symfony HTTP Foundation (`getPreferredLanguage`)

## Sources Consulted
- Laravel Localization docs: https://laravel.com/docs/11.x/localization
- Laravel Middleware docs (Laravel 11 bootstrap/app.php registration): https://laravel.com/docs/11.x/middleware
- Laravel Migrations docs: https://laravel.com/docs/11.x/migrations
- Laravel Blade docs (`@lang`, `@json`): https://laravel.com/docs/11.x/blade
- Carbon docs (`translatedFormat`, `diffForHumans`, `setLocale`): https://carbon.nesbot.com/docs/
- PHP NumberFormatter manual: https://www.php.net/manual/en/class.numberformatter.php
- Symfony Request `getPreferredLanguage()`: https://symfony.com/doc/current/components/http_foundation.html
- Illuminate\Support\Str::plural() source — confirmed English-only

## Issues Found
1. **Incorrect day of week in Carbon example** — The `translatedFormat('l, F j, Y')` comment claimed February 3, 2026 was a Monday. February 3, 2026 is actually a Tuesday. Updated the English/Spanish example output to "Tuesday, February 3, 2026" and "martes, febrero 3, 2026".
2. **Misleading mention of `Str::plural()`** — The pluralization section recommended `Str::plural()` alongside `trans_choice()` for handling pluralization "for different languages". `Illuminate\Support\Str::plural()` only supports English word inflection and is not a localization helper. Removed the `Str::plural()` reference and rephrased the sentence to point only at `trans_choice()`.

## Review Notes
- All Laravel APIs referenced (`__()`, `trans()`, `trans_choice()`, `@lang`, `@json`, `App::setLocale()`, `App::getLocale()`, `config('app.locale')`, `lang:publish`, `getPreferredLanguage()`, `translatedFormat()`, `diffForHumans()`, the Laravel 11 `bootstrap/app.php` middleware registration with `$middleware->web(append: [...])`) are current and correct.
- Pluralization syntax (`{0} ... |{1} ... |[2,*] ...` and `:count singular|:count plural`) matches Laravel's documented forms.
- The PHP comment line above `<?php` in language file examples (e.g., `// lang/en/messages.php`) is a documentation convention used to label the file; if copied verbatim into a real file it would be emitted as literal output before the PHP block. This is standard for tutorials and not technically incorrect — left as-is.
- `NumberFormatter::formatCurrency` exact output (e.g., `EUR99.99` vs `€99.99`) varies by ICU version and locale data; the post's illustrative output is plausible for some ICU builds, so left as-is.
- The migration filename in the example (`2026_02_03_add_locale_to_users_table.php`) omits the time component that `php artisan make:migration` would generate (e.g., `2026_02_03_120000_...`). Laravel still runs migrations whose filename starts with a sortable date prefix, so this is functional. Left as-is.
