# Validation Summary: How to Build Microservices with Scala

## Status
validated

## Post Type
Tutorial / Hands-on guide

## Technologies Covered
- Scala 2.13.12
- Akka HTTP 10.5.3 (with akka-actor-typed, akka-stream, akka-http-spray-json)
- Akka 2.8.5
- Akka Circuit Breaker (`akka.pattern.CircuitBreaker`)
- Typesafe Config (HOCON) 1.4.3
- Logback 1.4.14 / SLF4J 2.x
- sbt 1.9.7 and sbt-assembly 2.1.5
- ScalaTest 3.2.17 and akka-http-testkit
- Consul (HashiCorp) and OrbitzWorldwide `consul-client` 1.5.3
- Docker (multi-stage builds) and Docker Compose
- Eclipse Temurin JRE 17

## Sources Consulted
- Akka Circuit Breaker docs — https://doc.akka.io/libraries/akka-core/current/common/circuitbreaker.html
- Akka typed Logging docs — https://doc.akka.io/libraries/akka-core/current/typed/logging.html
- Akka HTTP JSON Support (spray-json) — https://doc.akka.io/docs/akka-http/current/common/json-support.html
- Scala 2.13.12 release — https://www.scala-lang.org/news/2.13.12/
- sbt 1.9.7 release — https://github.com/sbt/sbt/releases/tag/v1.9.7
- sbt-assembly 2.1.5 release — https://github.com/sbt/sbt-assembly/releases/tag/v2.1.5
- Maven Central entries for akka 2.8.5, akka-http 10.5.3, logback 1.4.14, typesafe config 1.4.3, consul-client 1.5.3
- OrbitzWorldwide / rickfast consul-client — https://github.com/rickfast/consul-client
- Docker Hub: hseeberger/scala-sbt, eclipse-temurin, consul, postgres
- SLF4J 2.x binding model (ServiceLoader via `META-INF/services/org.slf4j.spi.SLF4JServiceProvider`)

## Issues Found
1. **sbt-assembly merge strategy could break SLF4J 2.x binding at runtime.** The original snippet discarded all of `META-INF`. Since Logback 1.4.14 depends on SLF4J 2.x and SLF4J 2.x discovers its binding via the `ServiceLoader` pattern (`META-INF/services/org.slf4j.spi.SLF4JServiceProvider`), discarding the entire `META-INF` directory would produce a fat JAR that fails to find a logging backend at runtime. Updated the merge strategy to concatenate `META-INF/services/*` files before discarding the rest of `META-INF`. Added a short inline comment explaining why ServiceLoader files are preserved.

All other technical claims, code samples, library versions, Akka typed APIs (`system.classicSystem.scheduler`, `system.log` returning `org.slf4j.Logger`, `CircuitBreaker(...).onOpen/.onClose/.onHalfOpen/.withCircuitBreaker`), Akka HTTP usage (`Http().newServerAt(...).bind`, `Marshal(body).to[RequestEntity]`, `pathEnd`, directive composition), the consul-client builder API including `RegCheck.http(url, intervalSeconds)`, the Dockerfile JVM flags (`-XX:+UseContainerSupport`, `-XX:MaxRAMPercentage`, `-XX:InitialRAMPercentage`), and the Docker image tags (`eclipse-temurin:17-jre-alpine`, `consul:1.15`, `postgres:15-alpine`, `hseeberger/scala-sbt:17.0.2_1.6.2_2.13.8`) verified as correct for the post's time frame.

## Review Notes
- The `hseeberger/scala-sbt` Docker image is archived; the actively maintained successor is `sbtscala/scala-sbt`. The tag used in the post still resolves on Docker Hub and the build works, so this is a future deprecation concern rather than a current error.
- The official `consul` Docker image was renamed to `hashicorp/consul` after HashiCorp's BSL relicensing in August 2023. The `consul:1.15` tag still exists on the library image (pre-rename), so the docker-compose snippet works as written, but readers pinning to `consul:1.16+` will need to switch to `hashicorp/consul:1.16+`.
- Akka 2.7+ uses the Business Source License (BSL). Commercial users at scale should be aware of the licensing implications when adopting Akka 2.8.x. Not a technical error in the post, but worth noting for production adoption.
- The `OrderService` example in section 5 uses `Future.successful(order)` with `order` shown as elided pseudocode (`// ... create order`); this is clearly illustrative and not a compilation target.
- The mix of `concat(...)` and infix `~` for route composition is stylistically inconsistent but both compile and behave identically.
