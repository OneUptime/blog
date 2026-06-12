# Validation Summary: How to Use Laravel Events and Listeners

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Laravel events and listeners
- PHP
- Laravel Artisan commands
- Laravel queued listeners
- Eloquent model observers
- Laravel broadcasting and Echo
- Laravel event testing helpers

## Sources Consulted
- Laravel Events documentation: https://laravel.com/docs/13.x/events
- Laravel Eloquent observers documentation: https://laravel.com/docs/13.x/eloquent#observers
- Laravel Broadcasting documentation: https://laravel.com/docs/13.x/broadcasting

## Issues Found
- The post described manual event/listener registration with `app/Providers/EventServiceProvider` and a `$listen` property. Current Laravel documentation shows event discovery as the default and manual registrations using the `Event` facade in `AppServiceProvider`. Updated the example to use `Event::listen(...)` calls in `AppServiceProvider`.
- The post registered event subscribers with an `EventServiceProvider` `$subscribe` property. Current Laravel documentation recommends `Event::subscribe(...)` in `AppServiceProvider` when manual subscriber registration is needed. Updated the snippet accordingly.
- The post said event discovery should be enabled with `shouldDiscoverEvents()` and `discoverEventsWithin()` in `EventServiceProvider`. Current Laravel documentation states listeners in `app/Listeners` are discovered by default and custom discovery paths are configured with `withEvents(...)` in `bootstrap/app.php`. Updated that section and example.

## Review Notes
The remaining commands, listener examples, queued listener behavior, observer examples, broadcasting pattern, and event testing helpers align with current Laravel documentation. The article remains version-neutral, but the corrected registration examples now reflect current Laravel application structure.
