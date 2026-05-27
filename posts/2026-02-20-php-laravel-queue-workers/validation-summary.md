# Validation Summary: How to Use Laravel Queue Workers for Background Processing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PHP
- Laravel queues
- Laravel queue workers
- Redis queue driver
- Database queue driver
- Amazon SQS queue driver
- Laravel Horizon
- Laravel job middleware
- Laravel job batching

## Sources Consulted
- Laravel 12.x Queue documentation: https://laravel.com/docs/12.x/queues
- Laravel 13.x Queue documentation: https://laravel.com/docs/13.x/queues
- Laravel 13.x Horizon documentation: https://laravel.com/docs/13.x/horizon
- Laravel 12.x Validation documentation: https://laravel.com/docs/12.x/validation
- Laravel 12.x Batchable API reference: https://api.laravel.com/docs/12.x/Illuminate/Bus/Batchable.html

## Issues Found
- The queue configuration used `retry_after => 90` while the `ProcessOrder` job declared `$timeout = 120`. Laravel documents that job and worker timeouts should be shorter than `retry_after`; otherwise, jobs may be retried while still running. Changed the Redis and database `retry_after` values to 150 seconds and clarified the comment.
- The `OrderController` snippet imported `Illuminate\Http\Request` but called `$request->validated()`, which is available on form requests or validator instances. Changed the controller to use a `StoreOrderRequest` FormRequest and added the missing `SendFollowUpSurvey` job import.
- The `ReportController` batching snippet referenced `Order` without importing it. Added the missing `App\Models\Order` import.
- The batching section omitted Laravel's required `job_batches` table setup and did not mention the `Batchable` trait for batched jobs. Added the `make:queue-batches-table` and `migrate` commands and a concise note that batched jobs should use `Illuminate\Bus\Batchable`.

## Review Notes
The older job trait style used in the examples remains technically valid, although current Laravel documentation commonly shows the consolidated `Illuminate\Foundation\Queue\Queueable` trait in generated job examples.
