# Validation Summary: How to Handle Configuration Management in Microservices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes ConfigMaps, Secrets, Deployments, and environment variables
- Spring Cloud Config Server and Config Client
- Spring Boot Actuator and Prometheus metrics configuration
- HashiCorp Consul KV
- Redis Pub/Sub with redis-py
- FastAPI lifecycle hooks
- Python dataclasses and typing
- Pydantic v2 validation
- Feature flags and gradual rollout logic

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes ConfigMap environment variable documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Spring Cloud Config Git backend documentation: https://docs.spring.io/spring-cloud-config/reference/server/environment-repository/git-backend.html
- Spring Cloud Config client documentation: https://docs.spring.io/spring-cloud-config/reference/client.html
- Spring Cloud Config encryption documentation: https://docs.spring.io/spring-cloud-config/reference/server/encryption-and-decryption.html
- Spring Cloud Bus endpoint documentation: https://docs.spring.io/spring-cloud-bus/reference/spring-cloud-bus/bus-endpoints.html
- Spring Boot Actuator Prometheus metrics documentation: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- HashiCorp Consul KV command documentation: https://developer.hashicorp.com/consul/commands/kv/put
- HashiCorp Consul blocking query documentation: https://developer.hashicorp.com/consul/api-docs/features/blocking
- redis-py Pub/Sub documentation: https://redis.readthedocs.io/en/stable/advanced_features.html
- Pydantic v2 migration documentation: https://pydantic.dev/docs/validation/latest/get-started/migration/
- Pydantic validator documentation: https://pydantic.dev/docs/validation/2.9/concepts/validators/

## Issues Found
- The Kubernetes Deployment example was invalid for `apps/v1` because it omitted `spec.selector` and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels`.
- The Kubernetes Deployment referenced ConfigMaps and Secrets in the `production` namespace but did not place the Deployment in that namespace. Added `metadata.namespace: production`.
- The Spring Cloud Config server example used `bus-refresh` in the actuator exposure list. Current Spring Cloud Bus documents the endpoint ID as `busrefresh`, so the exposure list was corrected.
- The Spring Cloud Config encryption example implied that `spring.cloud.config.server.encrypt.enabled: true` configured encryption. Replaced it with a top-level `encrypt.key` example, which is required for serving `{cipher}` encrypted values.
- The Spring Boot Prometheus metrics export property used the pre-Spring Boot 3 path `management.metrics.export.prometheus.enabled`. Updated it to `management.prometheus.metrics.export.enabled`.
- The Spring Cloud Config client example used `bootstrap.yml` and `spring.cloud.config.uri`. Updated it to the current Spring Boot Config Data style with `spring.config.import: "configserver:http://config-server:8888"`.
- The Consul Python example loaded slash-delimited KV keys but later read dotted keys such as `database.host`. Updated the loader to normalize `/` to `.`.
- The Consul watcher only watched service-specific keys and would miss shared configuration changes. Updated the watch prefix to `config/`.
- The Consul reload path did not clear stale cache entries before reloading. Added a cache clear before layered reload.
- The Consul CLI feature flag example stored one JSON object at `features`, but the usage example read `features.new_checkout`. Changed the commands to write individual hierarchical keys that normalize to the dotted lookup names.
- The Pydantic validation example used deprecated v1 `@validator` APIs. Updated it to Pydantic v2 `@field_validator`.
- The Pydantic model used a mutable list default for `allowed_origins`. Replaced it with `Field(default_factory=lambda: ["*"])`.

## Review Notes
The examples remain illustrative rather than complete runnable services. For production use, Spring Cloud Bus requires the relevant bus transport dependency, Config Server encryption needs secure key management, and Kubernetes Secret values should be managed by a secret manager or sealed/encrypted workflow rather than committed as plaintext examples.
