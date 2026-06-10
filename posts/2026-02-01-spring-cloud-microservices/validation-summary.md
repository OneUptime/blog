# Validation Summary: How to Implement Microservices with Spring Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring Cloud
- Spring Cloud Netflix Eureka (service discovery)
- Spring Cloud Config (centralized configuration)
- Spring Cloud LoadBalancer (client-side load balancing)
- Spring Cloud Gateway (API gateway)
- Spring WebFlux (WebClient, reactive filters)
- YAML/Maven configuration

## Sources Consulted
- Spring Cloud Netflix reference docs (Eureka server/client): https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/
- Spring Cloud Config reference docs: https://docs.spring.io/spring-cloud-config/docs/current/reference/html/
- Spring Cloud LoadBalancer reference docs: https://docs.spring.io/spring-cloud-commons/docs/current/reference/html/#spring-cloud-loadbalancer
- Spring Cloud Gateway reference docs: https://docs.spring.io/spring-cloud-gateway/docs/current/reference/html/
- Spring Cloud 2020.0 (Ilford) release notes (bootstrap context removal): https://github.com/spring-cloud/spring-cloud-release/wiki/Spring-Cloud-2020.0-Release-Notes
- Spring Boot WebFlux / WebClient documentation: https://docs.spring.io/spring-framework/reference/web/webflux-webclient.html

## Issues Found
1. **Missing bootstrap dependency for `bootstrap.yml`** - The post instructs readers to put config-client settings in `bootstrap.yml`, but since Spring Cloud 2020.0 (Ilford, late 2020) the bootstrap context is no longer enabled by default. Without the `spring-cloud-starter-bootstrap` dependency (or migrating to `spring.config.import` in `application.yml`), `bootstrap.yml` is silently ignored and the service will fail to fetch its remote configuration. **Fix:** Added the `spring-cloud-starter-bootstrap` dependency to the config-client dependencies snippet, with a short note that the modern alternative is `spring.config.import` in `application.yml`. Style and surrounding prose preserved.

## Review Notes
- The Eureka server (`@EnableEurekaServer`) and Eureka client setup (auto-configured by the starter; `@EnableEurekaClient`/`@EnableDiscoveryClient` are no longer required) are correct for current Spring Cloud versions.
- The Eureka YAML keys (`register-with-eureka`, `fetch-registry`, `enable-self-preservation`, `service-url.defaultZone`, `prefer-ip-address`) are all accurate.
- Spring Cloud Config Server (`@EnableConfigServer`) and the Git-backed configuration (`spring.cloud.config.server.git.uri`, `default-label`) match official docs.
- `@LoadBalanced` on `WebClient.Builder` and using a service name in the URI (`http://product-service/...`) is the documented usage. The note that round-robin is the default selection strategy is correct (`RoundRobinLoadBalancer`).
- The custom `RandomLoadBalancer` example (with `@LoadBalancerClient`, `ReactorLoadBalancer<ServiceInstance>`, `LoadBalancerClientFactory.PROPERTY_NAME`, and `ServiceInstanceListSupplier`) matches the Spring Cloud Commons reference docs.
- Spring Cloud Gateway routes, predicates (`Path=`), filters (`StripPrefix=1`), the `lb://` URI scheme, and `discovery.locator.enabled` / `lower-case-service-id` are accurate.
- The `GlobalFilter` + `Ordered` implementation, `ServerWebExchange` APIs, and the reactive `chain.filter(exchange).then(Mono.fromRunnable(...))` pattern are correct.
- Caveat the reader should be aware of: Spring Cloud's "starter" artifact names are stable, but the gateway has a new co-existing artifact name (`spring-cloud-starter-gateway-server-webflux`) in recent releases. `spring-cloud-starter-gateway` still works and remains the canonical artifact.
- Versions are not pinned in the BOM, so the reader will need to manage a `spring-cloud.version` property and import `spring-cloud-dependencies` BOM in their actual project. This is standard Spring Cloud practice and the post correctly assumes that context.
