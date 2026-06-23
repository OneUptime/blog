# Validation Summary: How to Configure Connection Timeout in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring Framework RestTemplate and WebClient
- Apache HttpClient 5
- Reactor Netty
- HikariCP
- Jakarta Persistence / Hibernate
- Spring Cloud OpenFeign
- Spring Data Redis with Lettuce
- Embedded Tomcat
- Spring MVC async requests
- Resilience4j

## Sources Consulted
- Spring Boot RestTemplateBuilder API: https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/web/client/RestTemplateBuilder.html
- Spring Boot common application properties: https://docs.spring.io/spring-boot/appendix/application-properties/index.html
- Spring Framework HttpComponentsClientHttpRequestFactory API: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/client/HttpComponentsClientHttpRequestFactory.html
- Apache HttpClient 5 RequestConfig.Builder API: https://hc.apache.org/httpcomponents-client-5.6.x/5.6/httpclient5/apidocs/org/apache/hc/client5/http/config/RequestConfig.Builder.html
- Spring Framework WebClient timeout configuration: https://docs.spring.io/spring-framework/reference/web/webflux-webclient/client-builder.html#webflux-client-builder-reactor-timeout
- Reactor Netty HTTP client reference: https://projectreactor.io/docs/netty/release/reference/http-client.html
- Jakarta Persistence Query API: https://jakarta.ee/specifications/persistence/3.2/apidocs/jakarta.persistence/jakarta/persistence/query
- Spring Cloud OpenFeign reference: https://docs.spring.io/spring-cloud-openfeign/docs/current/reference/html/
- Spring Data Redis LettuceConnectionFactory API: https://docs.spring.io/spring-data/data-redis/docs/current/api/org/springframework/data/redis/connection/lettuce/LettuceConnectionFactory.html
- Lettuce production timeout documentation: https://redis.io/docs/latest/develop/clients/lettuce/produsage/
- Spring Cloud CircuitBreaker Resilience4j reference: https://docs.spring.io/spring-cloud-circuitbreaker/docs/current/reference/html/spring-cloud-circuitbreaker-resilience4j.html
- Resilience4j Reactor and TimeLimiter documentation: https://resilience4j.readme.io/docs/getting-started-1 and https://resilience4j.readme.io/docs/timeout

## Issues Found
- RestTemplateBuilder used `setConnectTimeout` and `setReadTimeout`, which are deprecated for removal in Spring Boot 3.4+. Changed them to `connectTimeout` and `readTimeout`.
- Apache HttpClient 5 advanced RestTemplate example configured `connectionRequestTimeout`, which only controls waiting for a leased pooled connection, not establishing a TCP connection. Added `ConnectionConfig.setConnectTimeout` on the connection manager and clarified the pool-lease timeout comment.
- Timeout type table described socket and read timeouts too broadly. Updated the wording to distinguish idle socket reads from response/read waiting time.
- JPA/Hibernate YAML used an incorrect `hibernate.query.timeout` shape and seconds-based comment. Changed it to the standard `jakarta.persistence.query.timeout` property in milliseconds.
- HikariCP `data-source-properties` were presented as general settings. Clarified that these names are JDBC-driver specific.
- Tomcat duration values were numeric with comments implying milliseconds. Changed YAML to explicit `20s` and `30s` duration values and clarified the meaning of `connection-timeout`.
- Resilience4j `wait-duration-in-open-state` used a bare numeric value. Changed it to the explicit duration `10s`, matching documented configuration style.
- Removed an unused `WebClientRequestException` import from the timeout exception handler example.

## Review Notes
The examples are generally accurate for modern Spring Boot 3.x projects. Some snippets omit routine imports for brevity, such as service annotations, Lombok annotations, reactive types, and logging fields; that is acceptable for blog snippets but could be expanded in a future full sample project.
