# Validation Summary: How to Configure the IIS Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry IIS receiver
- OpenTelemetry Windows Performance Counters receiver
- IIS and Windows Performance Counters
- PowerShell and Windows services
- OTLP/HTTP exporting
- PowerShell DSC
- Windows containers

## Sources Consulted
- OpenTelemetry Collector IIS receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/iisreceiver/README.md
- OpenTelemetry Collector IIS receiver generated metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/iisreceiver/documentation.md
- OpenTelemetry Collector IIS receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/iisreceiver/metadata.yaml
- OpenTelemetry Collector Windows Performance Counters receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/windowsperfcountersreceiver/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Windows installation documentation: https://opentelemetry.io/docs/collector/install/binary/windows/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- Microsoft Learn, IIS application pool queueLength property: https://learn.microsoft.com/en-us/dotnet/api/microsoft.web.administration.applicationpool.queuelength
- Microsoft Learn, IIS processModel settings: https://learn.microsoft.com/en-us/iis/configuration/system.applicationHost/applicationPools/add/processModel
- Microsoft Learn, IIS serverRuntime settings: https://learn.microsoft.com/en-us/iis/configuration/system.webserver/serverruntime

## Issues Found
- The post listed IIS receiver metrics that are not emitted by the current receiver, including HTTP status code distributions, cache hit rates, `iis.request.duration`, `iis.network.bytes_sent`, and `iis.network.bytes_recv`. Removed or replaced these with documented metrics such as `iis.network.io`, `iis.network.blocked`, `iis.request.rejected`, `iis.application_pool.state`, and `iis.application_pool.uptime`.
- The multiple-site example treated the IIS site as a generic metric attribute named `site`. Updated it to use the documented `iis.site` resource attribute and removed an invalid attributes processor example.
- The key metrics explanations described cumulative counters as per-second measurements. Updated the wording to describe totals and derived rates accurately.
- The application-pool section implied that application pool state and uptime required the Windows Performance Counters receiver. Updated it to note that the IIS receiver emits those metrics, and limited the Windows Performance Counters example to additional worker-process counters with explicit metric definitions.
- The Windows Performance Counters example used `instances: ["w3wp*"]`, which is not a documented `instances` form. Replaced it with `instances: ["w3wp"]` and added a caveat for duplicate process instances and `Process V2`.
- The Collector installation examples used the core `otelcol` MSI, which does not include the IIS receiver. Updated installation, Dockerfile, service, event-log, and validation commands to use `otelcol-contrib` v0.153.0, the current documented release version on the review date.
- The Collector config validation command used the wrong argument order. Updated it to `otelcol-contrib.exe validate --config=config.yaml`.
- The commented filter processor example used the legacy filter configuration shape. Updated it to the current `metric_conditions` syntax.
- The PowerShell DSC file resource used `Get-Content` without `-Raw`, which can provide an array instead of a single string. Updated it to `Get-Content -Raw`.
- The IIS tuning section showed unsupported `processModel` thread attributes and used `maxRequestEntityAllowed` as a connection-limit setting. Replaced these with technically accurate guidance and `appConcurrentRequestLimit`.
- The internal telemetry OTLP example omitted the `protocol: http/protobuf` setting used by the current Collector internal telemetry documentation. Added it.

## Review Notes
The IIS receiver metrics are documented as development-stability metrics even though the receiver is beta for metrics overall. The post now uses the current OpenTelemetry Collector Contrib v0.153.0 package names and service naming; future reviews should re-check the release version and receiver metric set because Collector contrib components change frequently.
