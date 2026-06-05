# Validation Summary: How to Monitor Magento Performance with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Magento 2 / Adobe Commerce module development
- PHP
- OpenTelemetry PHP SDK
- OTLP trace exporting
- Magento dependency injection, plugins, observers, cache, and database adapters

## Sources Consulted
- OpenTelemetry PHP documentation: https://opentelemetry.io/docs/languages/php/
- OpenTelemetry PHP instrumentation guide: https://opentelemetry.io/docs/languages/php/instrumentation/
- OpenTelemetry PHP exporters guide: https://opentelemetry.io/ro/docs/languages/php/exporters/
- OpenTelemetry PHP resources guide: https://opentelemetry.io/docs/languages/php/resources/
- OpenTelemetry PHP SDK guide: https://opentelemetry.io/ja/docs/languages/php/sdk/
- OpenTelemetry PHP API reference: https://open-telemetry.github.io/opentelemetry-php/
- Adobe Commerce component registration documentation: https://developer.adobe.com/commerce/php/development/build/component-registration
- Adobe Commerce component file structure documentation: https://developer.adobe.com/commerce/php/development/prepare/component-file-structure
- Adobe Commerce plugin documentation: https://developer.adobe.com/commerce/php/development/components/plugins
- Adobe Commerce dependency injection documentation: https://developer.adobe.com/commerce/php/development/build/dependency-injection-file
- Adobe Commerce event list: https://developer.adobe.com/commerce/php/development/components/events-and-observers/event-list
- Magento 2 FrontControllerInterface source: https://github.com/magento/magento2/blob/2.4-develop/lib/internal/Magento/Framework/App/FrontControllerInterface.php
- Magento 2 ActionInterface source: https://github.com/magento/magento2/blob/2.4-develop/lib/internal/Magento/Framework/App/ActionInterface.php
- Magento 2 Cache FrontendInterface source: https://github.com/magento/magento2/blob/2.4-develop/lib/internal/Magento/Framework/Cache/FrontendInterface.php

## Issues Found
- The module configuration path was wrong. Magento modules require `etc/module.xml`, so I changed `app/code/Vendor/OpenTelemetry/module.xml` to `app/code/Vendor/OpenTelemetry/etc/module.xml` and expanded the `mkdir` command to create the needed subdirectories.
- The Composer dependencies were incomplete for the OpenTelemetry snippets. I added `open-telemetry/sem-conv` for semantic convention constants and `guzzlehttp/guzzle` to satisfy the HTTP client/factory requirements used by the OTLP HTTP exporter.
- The tracer service used a private constructor and singleton pattern, which conflicts with Magento dependency injection. I changed it to a public constructor so Magento can instantiate it.
- The tracer service used outdated or incorrect OpenTelemetry PHP APIs and constants, including `HttpTransportFactory`, older `ResourceAttributes`, and `Globals::registerInitializer`. I updated the snippet to use `OtlpHttpTransportFactory`, current semantic convention classes, `Sdk::builder()->buildAndRegisterGlobal()`, and auto-shutdown.
- The controller plugin targeted `ActionInterface::execute()` with a `RequestInterface` argument, but `ActionInterface::execute()` takes no arguments. I changed the plugin to wrap `FrontControllerInterface::dispatch(RequestInterface $request)`.
- The controller plugin set a potentially null store attribute. I cast the store code to a string with a default empty value.
- The database plugin assumed SQL was always a string. I cast `$sql` to a string before parsing and sanitizing it so objects such as select builders do not break the helper methods.
- The cache section did not register its plugin. I added the missing `di.xml` snippet for `Magento\Framework\Cache\FrontendInterface`.
- The cache plugin hard-coded `cache.system` as `redis`, which is not necessarily true for Magento deployments. I changed it to `magento`.
- The environment configuration examples used `app/etc/env.php` keys that the sample code never read. I changed them to environment variables consumed by the OpenTelemetry setup.
- The sampling example used a custom `env.php` structure that the sample code never implemented. I changed it to the `OTEL_TRACES_SAMPLER_ARG` value used by the tracer service.

## Review Notes
The article is now technically coherent as a manual instrumentation tutorial, but it is still a simplified example. A production Magento module should consider sensitive SQL data redaction, route-aware sampling with a custom sampler or Collector tail sampling, and broader coverage for async consumers, cron, GraphQL, and Web API requests.
