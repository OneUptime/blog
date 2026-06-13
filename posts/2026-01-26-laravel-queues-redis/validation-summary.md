# Validation Summary: How to Use Laravel Queues with Redis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Laravel Queues
- Laravel Horizon
- Redis
- PHP
- Supervisor
- Laravel job batching, retries, rate limiting, and failed job handling

## Sources Consulted
- Laravel Queues documentation: https://laravel.com/docs/13.x/queues
- Laravel Horizon documentation: https://laravel.com/docs/13.x/horizon

## Issues Found
- The Redis prerequisites wording said to install both phpredis and Predis. Laravel requires `predis/predis` or the phpredis PHP extension, so the wording was changed to "or".
- The `ProcessPodcastUpload` and `ImportData` examples referenced notification classes without importing them. Added the missing notification imports.
- The dispatch options snippet used `Bus::chain()` without a usable import in the snippet. Changed it to a fully qualified `\Illuminate\Support\Facades\Bus::chain()` call.
- The retry example used a `$retryUntil` property and a non-documented `retryIf()` method. Laravel expects a `retryUntil()` method returning a date/time. Reworked the example to use `retryUntil()` and explicit exception handling for non-retriable exceptions.
- The batch section omitted the `Batchable` trait requirement for batched jobs. Added a sentence noting that jobs added to a batch must use `Illuminate\Bus\Batchable`.
- The batch migration command used `queue:batches-table`, which is incorrect in current Laravel. Changed it to `make:queue-batches-table`.
- The Horizon examples used `minProcesses` / `maxProcesses` with the `simple` balancing strategy. Current Horizon documentation uses `processes` for simple balancing, so those entries were corrected.
- The failed jobs migration command used `queue:failed-table`, which is incorrect in current Laravel. Changed it to `make:queue-failed-table`.
- Failed job examples used numeric IDs. Current Laravel failed job examples use UUIDs, so retry and forget examples were updated to UUIDs.
- Added the Horizon-specific `horizon:forget` command because Laravel documents it as the correct way to delete failed jobs when Horizon is in use.
- The architecture diagram labeled Redis as a "Redis Cluster" while Horizon documentation states Horizon is not compatible with Redis Cluster. Renamed that diagram section to "Redis Primary/Replica".

## Review Notes
The examples remain illustrative and depend on application-specific classes such as `AudioProcessor`, `PodcastProcessingFailed`, `ExportUserData`, `BatchCompleted`, and `ImportFailed`. Laravel 13 documentation was used as the current reference because the post does not pin a Laravel version.
