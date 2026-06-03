# Validation Summary: How to Deploy Spring Cloud Gateway on Kubernetes with Route Predicates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Spring Cloud Gateway
- Spring Boot
- Spring Framework WebFlux
- Project Reactor
- Spring Cloud Kubernetes
- Spring Cloud LoadBalancer
- Spring Boot Actuator
- Maven
- Docker
- Kubernetes Deployments, Services, and ConfigMaps

## Sources Consulted
- Spring Cloud Gateway route predicate factory documentation: https://docs.spring.io/spring-cloud-gateway/reference/4.2/spring-cloud-gateway/request-predicates-factories.html
- Spring Cloud Gateway route predicate and filter shortcut configuration documentation: https://docs.spring.io/spring-cloud-gateway/reference/4.2/spring-cloud-gateway/configuring-route-predicate-factories-and-filter-factories.html
- Spring Cloud Gateway StripPrefix GatewayFilter documentation: https://docs.spring.io/spring-cloud-gateway/reference/4.2/spring-cloud-gateway/gatewayfilter-factories/stripprefix-factory.html
- Spring Cloud Gateway developer guide for custom route predicate factories: https://docs.spring.io/spring-cloud-gateway/reference/4.2/spring-cloud-gateway/developer-guide.html
- Spring Cloud Kubernetes reference documentation for starters, DiscoveryClient, load balancer, and reload behavior: https://docs.spring.io/spring-cloud-kubernetes/docs/current/reference/html/index.html
- Spring Cloud 2023.0 release announcement: https://spring.io/blog/2023/12/06/spring-cloud-2023-0-0-aka-leyton-is-now-available
- Spring Boot 3.2 getting started documentation: https://docs.spring.io/spring-boot/docs/3.2.x/reference/html/getting-started.html
- Kubernetes ConfigMap update documentation: https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/

## Issues Found
- The introduction said the gateway was built on Spring Framework 5 and Spring Boot 2, but the article's dependency set uses Spring Boot 3.2.0 and Spring Cloud 2023.0.0, which align with Spring Framework 6 and Spring Boot 3. Updated the version claim.
- The Maven POM snippet omitted `modelVersion` and project coordinates, so it was not a complete valid Maven project file as presented. Added the standard POM namespace, `modelVersion`, `groupId`, `artifactId`, `version`, and `name`.
- The custom route predicate Java snippet omitted imports required for the class to compile. Added imports for Java utility/function types, `AbstractRoutePredicateFactory`, `@Component`, and `ServerWebExchange`.
- The custom predicate used `String.toUpperCase()` without a locale. Changed it to `toUpperCase(Locale.ROOT)` to avoid locale-sensitive behavior.
- The ConfigMap section and conclusion implied that mounted ConfigMap changes automatically update Spring Gateway routes without service restarts. Kubernetes updates mounted files eventually, but Spring Boot will not automatically reload those route properties unless a restart or refresh mechanism is configured. Updated the wording to state that requirement.

## Review Notes
- The route predicate and filter shortcut syntax for `Path`, `Method`, `Header`, `Query`, `Weight`, `Between`, `After`, and `StripPrefix` matches Spring Cloud Gateway's documented syntax.
- The Kubernetes Deployment and Service manifests use valid core fields. The `gateway` namespace must exist before applying these resources, but that is an operational prerequisite rather than an error in the examples.
- The test examples are illustrative and assume reachable backend services or stubs that return expected responses. A production-ready version should bind the gateway to stub downstream services before asserting route outcomes.
