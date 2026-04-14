# Validation Summary: How to Build Microservices with Dapr and NestJS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Dapr JavaScript SDK (`@dapr/dapr`)
- NestJS (Node.js framework)
- TypeScript
- Dapr CLI

## Sources Consulted
- Dapr JavaScript SDK source and types on GitHub (https://github.com/dapr/js-sdk)
- Dapr JS SDK documentation (https://docs.dapr.io/developing-applications/sdks/js/js-client/)
- NestJS official documentation — Modules (https://docs.nestjs.com/modules)
- NestJS official documentation — Custom Providers (https://docs.nestjs.com/fundamentals/custom-providers)
- NestJS official documentation — Controllers (https://docs.nestjs.com/controllers)
- NestJS CLI documentation (https://docs.nestjs.com/cli/overview)
- Dapr CLI reference for `dapr run` (https://docs.dapr.io/reference/cli/dapr-run/)

## Issues Found

1. **`daprHost` included protocol prefix (line 40):** The `DaprClient` constructor was passed `"http://localhost"` as the `daprHost` value. The Dapr JS SDK expects a plain hostname or IP address (e.g., `"127.0.0.1"`) without a protocol prefix — the communication protocol is determined by the separate `communicationProtocol` option. Changed to `"127.0.0.1"`.

2. **Deprecated `--components-path` CLI flag (line 147):** The `dapr run` command used `--components-path`, which was renamed to `--resources-path` in Dapr CLI v1.11. Since all currently supported Dapr versions use the new flag name, updated to `--resources-path`.

3. **`SubscriptionsController` missing constructor injection and imports (lines 114-125):** The controller referenced `this.ordersService.markPaid()` but had no constructor injecting `OrdersService`, and was missing import statements for `Controller`, `Post`, `Body`, and `OrdersService`. Added the missing constructor and imports so the code would actually compile and work at runtime.

## Review Notes
- The `SubscriptionsController` example uses a programmatic subscription approach (registering an HTTP endpoint). Dapr also supports declarative subscriptions via a subscription resource YAML file. The post doesn't mention this alternative, which is fine for a tutorial but worth noting.
- The `CreateOrderDto` class is referenced but never defined in the post. This is acceptable for a tutorial that focuses on Dapr integration rather than NestJS basics, but readers will need to create this DTO themselves.
- The `OrdersService.markPaid()` method is called in the subscription handler but never defined. Again acceptable for a tutorial showing the pattern, but readers should be aware they need to implement it.
