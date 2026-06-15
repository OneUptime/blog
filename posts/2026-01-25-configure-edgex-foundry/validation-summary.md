# Validation Summary: How to Configure EdgeX Foundry

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- EdgeX Foundry
- Docker Compose
- EdgeX device services
- EdgeX application services
- MQTT
- Redis
- Consul
- LF Edge eKuiper
- Python requests
- YAML and JSON service configuration

## Sources Consulted
- EdgeX Foundry 3.1 Docker Compose release files: https://github.com/edgexfoundry/edgex-compose/tree/v3.1
- EdgeX Foundry 3.1 Device Profile documentation: https://docs.edgexfoundry.org/3.1/microservices/device/profile/Ch-DeviceProfile/
- EdgeX Foundry 3.1 Device Services API documentation: https://docs.edgexfoundry.org/3.1/api/devices/Ch-APIDeviceSDK/
- EdgeX Foundry 3.1 Core Command API documentation: https://docs.edgexfoundry.org/3.1/api/core/Ch-APICoreCommand/
- EdgeX Foundry 3.1 Core Data OpenAPI specification: https://github.com/edgexfoundry/edgex-go/blob/v3.1.1/openapi/v3/core-data.yaml
- EdgeX Foundry 3.1 Core Metadata OpenAPI specification: https://github.com/edgexfoundry/edgex-go/blob/v3.1.1/openapi/v3/core-metadata.yaml
- EdgeX Foundry 3.1 Core Command OpenAPI specification: https://github.com/edgexfoundry/edgex-go/blob/v3.1.1/openapi/v3/core-command.yaml
- EdgeX device-mqtt v3.1.1 configuration: https://github.com/edgexfoundry/device-mqtt-go/blob/v3.1.1/cmd/res/configuration.yaml
- EdgeX app-service-configurable v3.1.0 HTTP and MQTT export profiles: https://github.com/edgexfoundry/app-service-configurable/tree/v3.1.0/res
- eKuiper 1.12 EdgeX rule engine tutorial: https://ekuiper.org/docs/en/v1.12/edgex/edgex_rule_engine_tutorial.html
- eKuiper 1.12 EdgeX metadata function documentation: https://ekuiper.org/docs/en/v1.12/edgex/edgex_meta.html
- eKuiper 1.12 EdgeX message bus sink documentation: https://ekuiper.org/docs/en/v1.12/guide/sinks/builtin/edgex.html
- eKuiper 1.12 REST API documentation for streams and rules: https://ekuiper.org/docs/en/v1.12/api/restapi/streams.html and https://ekuiper.org/docs/en/v1.12/api/restapi/rules.html

## Issues Found
- The Docker Compose download used the `main` branch and referenced a `.env` file that is not part of the EdgeX 3.1 compose release. Updated the command to download the Napa `v3.1` non-secure compose file directly.
- The sample compose file mixed older environment overrides with EdgeX 3.1 service conventions. Updated service image tags to 3.1.1 where appropriate, added the common config bootstrapper, used the official Consul/Redis container names, and switched service overrides to `SERVICE_HOST` plus common config bootstrap settings.
- The eKuiper compose service exposed port 59720 without configuring eKuiper to listen there. Added the `KUIPER__BASIC__RESTPORT` override and updated EdgeX Redis connection reuse environment variables.
- The MQTT device service configuration was shown as TOML and used outdated fields such as `CredentialsPath` and `[MQTTBrokerInfo.Topics]`. Replaced it with the EdgeX 3.1 YAML structure using `MQTTBrokerInfo`, `CredentialsName`, and `Writable.InsecureSecrets`.
- The application service HTTP export snippet used incorrect field casing for `Url` and HTTP method values. Corrected these fields and added `SecretName` where `SecretValueKey` is used.
- The MQTT export snippet used `QoS`; the configurable service profile uses `QOS`. Corrected the field and added `SecretName` for username/password auth.
- The eKuiper CLI and rule examples used invalid rule syntax. Replaced the pseudo-SQL `CREATE RULE ... WHEN ... DO ... INTO` example with a documented eKuiper rule JSON body and corrected stream creation commands.
- The eKuiper SQL examples treated EdgeX readings as `readings.temperature`; the EdgeX source exposes reading resource names as stream fields and uses `meta(...)` for metadata. Updated the SQL to use `temperature`, `humidity`, and `meta(deviceName)`.
- The EdgeX sink example used `server` instead of eKuiper's `host` field and referenced metadata without selecting it. Corrected the sink config and added `meta(*) AS edgex_meta`.
- The health check script treated eKuiper as if it exposed the EdgeX `/api/v3/ping` endpoint. Updated the service map so EdgeX services use `/api/v3/ping` and eKuiper uses its REST root endpoint.
- Removed an unused Python import from the REST API client example.

## Review Notes
The corrected examples are version-specific to EdgeX 3.1 / Napa and eKuiper 1.11-1.12-era behavior. Future updates should re-check these snippets before moving to EdgeX 4.x, because EdgeX compose files, service images, and configuration defaults continue to evolve.
