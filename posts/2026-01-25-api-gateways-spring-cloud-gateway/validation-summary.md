# Validation Summary: How to Build API Gateways with Spring Cloud Gateway

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Java
- Spring Boot
- Spring Cloud Gateway Server WebFlux
- Spring Cloud LoadBalancer
- Spring Cloud CircuitBreaker with Resilience4j
- Spring Data Redis Reactive
- Netflix Eureka client
- Spring Boot Actuator
- Micrometer and Prometheus
- JJWT
- YAML and Maven configuration

## Sources Consulted
- Spring Cloud Gateway WebFlux starter documentation: https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway-server-webflux/starter.html
- Spring Cloud Gateway WebFlux configuration documentation: https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway-server-webflux/configuration.html
- Spring Cloud Gateway common application properties: https://docs.spring.io/spring-cloud-gateway/reference/appendix.html
- Spring Cloud Gateway RequestRateLimiter documentation: https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway-server-webflux/gatewayfilter-factories/requestratelimiter-factory.html
- Spring Cloud Gateway Actuator API documentation: https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway-server-webflux/actuator-api.html
- Spring Cloud Gateway DiscoveryClient route locator documentation: https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway-server-webflux/the-discoveryclient-route-definition-locator.html
- Spring Cloud Gateway Fluent Java Routes API documentation: https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway-server-webflux/fluent-java-routes-api.html
- Spring Cloud 2025.1.2 release announcement: https://spring.io/blog/2026/06/11/spring-cloud-2025-1-2-aka-oakwood-has-been-released
- Spring Cloud supported versions matrix: https://github.com/spring-cloud/spring-cloud-release/wiki/Supported-Versions
- Spring Boot 3.0 configuration changelog for Redis property migration: https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Configuration-Changelog
- JJWT project documentation and parsing examples: https://github.com/jwtk/jjwt
- JJWT JwtParserBuilder API notes: https://github.com/jwtk/jjwt/blob/main/api/src/main/java/io/jsonwebtoken/JwtParserBuilder.java

## Issues Found
- The gateway starter used the older `spring-cloud-starter-gateway` artifact. Updated it to `spring-cloud-starter-gateway-server-webflux`, which is the current WebFlux starter documented by Spring Cloud Gateway.
- The Spring Cloud BOM was pinned to `2023.0.0`, which is outdated for a 2026 post. Updated it to `2025.1.2`, the current Oakwood service release available on June 15, 2026.
- The examples used the older `spring.cloud.gateway.routes` configuration namespace. Updated route examples to `spring.cloud.gateway.server.webflux.routes` and updated the discovery locator namespace to `spring.cloud.gateway.server.webflux.discovery.locator`.
- The Redis example used `spring.redis.*`, which was deprecated in Spring Boot 3. Updated it to `spring.data.redis.*`.
- The Java route example generated a UUID in `addRequestHeader`, which would be evaluated when the route is built rather than once per request. Replaced it with a static gateway header and left per-request request ID generation to the global filter example.
- The response header example used `${responseTime}`, which would be treated as a Spring property placeholder and is not a built-in response-time variable for `AddResponseHeader`. Replaced it with a static `X-Processed-By` header.
- The Prometheus actuator endpoint was exposed without adding the Prometheus registry dependency. Added `micrometer-registry-prometheus`.
- The `lb://` examples needed Spring Cloud LoadBalancer on the classpath. Added `spring-cloud-starter-loadbalancer`.
- The JJWT code used older parser APIs: `parserBuilder()`, `setSigningKey(...)`, `parseClaimsJws(...)`, and `getBody()`. Updated the example to the current `Jwts.parser().verifyWith(...).parseSignedClaims(...).getPayload()` API and added the required JJWT dependencies.
- The gateway actuator configuration used `management.endpoint.gateway.enabled`. Updated it to `management.endpoint.gateway.access: unrestricted`, which is required for the write operations shown, including route refresh.

## Review Notes
- The updated Spring Cloud `2025.1.x` release train targets Spring Boot 4 and Spring Framework 7. Projects that intentionally remain on Spring Boot 3.5 should use the Spring Cloud `2025.0.x` release train and the matching Gateway 4.3.x documentation.
- The custom JWT filter is technically valid as an example, but production systems should also validate issuer, audience, token lifetime, key rotation, and claim formats.
