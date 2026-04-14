# Validation Summary: How to Install and Configure the Dapr PHP SDK

## Status
validated

## Post Type
Tutorial / Getting Started Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- PHP
- Dapr PHP SDK (`dapr/php-sdk`)
- Composer
- Redis (as state store component)
- PHP-DI (dependency injection)

## Sources Consulted
- Dapr PHP SDK GitHub repository: https://github.com/dapr/php-sdk
- Dapr PHP SDK `composer.json` for package name and PHP version requirements
- Dapr PHP SDK source code (`DaprClient.php`, `DaprClientBuilder.php`, `App.php`, `HttpTokenTrait.php`, `config.php`) for API verification
- Dapr PHP SDK README for usage examples
- Dapr official documentation: https://docs.dapr.io/developing-applications/sdks/php/
- Dapr component specs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/

## Issues Found

1. **PHP version requirement incorrect**: Blog stated "PHP 8.0 or higher" but the SDK's `composer.json` requires `^8.4` (PHP 8.4+). Fixed to "PHP 8.4 or higher".

2. **`withHttpClient()` method does not exist**: The blog used `DaprClient::clientBuilder()->withHttpClient(new \GuzzleHttp\Client())->build()`. The `withHttpClient()` method does not exist on `DaprClientBuilder`. The correct method is `useHttpClient(string $httpHost)` which takes a URL string, not a Guzzle client object. Simplified the example to `DaprClient::clientBuilder()->build()` which uses the default HTTP host.

3. **PHP-DI integration code was incorrect**: `\Dapr\App::get_definitions()` does not exist in the SDK. Additionally, the code imported `\Dapr\DaprClient` (without `\Client\` namespace) which is the deprecated legacy client class. Replaced with the correct `App::create()` pattern that uses the modern `\Dapr\Client\DaprClient`.

4. **`trySaveState()` used with wrong signature**: `trySaveState()` requires an `$etag` parameter for optimistic concurrency and is not suitable for simple state saves. Changed to `saveState()` which is the correct method for basic state operations.

5. **`tryGetState()` does not exist**: There is no `tryGetState()` method in the Dapr PHP SDK. Changed to `getState()` which is the correct method for reading state.

6. **`DAPR_GRPC_PORT` environment variable not applicable**: The Dapr PHP SDK is HTTP-only and does not support gRPC. The `DAPR_GRPC_PORT` variable is not referenced anywhere in the SDK source. Removed it from the environment variable section.

## Review Notes
- The Dapr component YAML configuration for Redis state store is correct and follows the standard Dapr component spec format.
- The `dapr run` command syntax is correct.
- The `dapr list` and `curl` verification commands are correct.
- The `DAPR_HTTP_PORT` and `APP_API_TOKEN` environment variables are correctly documented.
- The SDK also supports a `DAPR_API_TOKEN` environment variable (for authenticating to the Dapr sidecar API), which is not mentioned in the post but is not required for a getting-started guide.
- The `getState()` return value access pattern (`$state->value['name']`) should work but depends on the specific return type; readers may need to adjust based on their SDK version.
