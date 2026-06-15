# Validation Summary: How to Build Non-Blocking APIs with Spring WebFlux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring WebFlux
- Project Reactor
- Reactor Netty
- Reactive MongoDB
- WebClient
- RouterFunctions and functional endpoints
- Server-Sent Events
- WebTestClient
- MockitoBean
- StepVerifier

## Sources Consulted
- Spring Boot Reference: Reactive Web Applications - https://docs.spring.io/spring-boot/reference/web/reactive.html
- Spring Framework Reference: WebFlux Overview - https://docs.spring.io/spring-framework/reference/web/webflux/new-framework.html
- Spring Framework Reference: WebClient - https://docs.spring.io/spring-framework/reference/web/webflux-webclient.html
- Spring Framework Reference: WebTestClient - https://docs.spring.io/spring-framework/reference/testing/webtestclient.html
- Spring Framework Reference: @MockitoBean and @MockitoSpyBean - https://docs.spring.io/spring-framework/reference/testing/annotations/integration-spring/annotation-mockitobean.html
- Spring Boot API: MockBean deprecation notice - https://docs.spring.io/spring-boot/3.5/api/java/org/springframework/boot/test/mock/mockito/MockBean.html
- Project Reactor Reference Guide - https://projectreactor.io/docs/core/3.7.0-M1/reference
- Spring Framework API: RestTemplate - https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/client/RestTemplate.html

## Issues Found
- The testing example used `@MockBean`, which is deprecated for removal in current Spring Boot 3.5 API documentation in favor of Spring Framework's `@MockitoBean`. Changed `@MockBean` to `@MockitoBean`.
- The `UserService.getUser` example converted every error, including `UserNotFoundException`, into a fallback user with `onErrorReturn`, but the later `StepVerifier` test expected `UserNotFoundException`. Changed the fallback to apply only to `ServiceException`, allowing not-found errors to propagate as shown by the test and global exception handler.
- The `EventStreamController` example called `userRepository.findAll()` without declaring or injecting `userRepository`, so the snippet would not compile as written. Added a `UserRepository` field and constructor injection.

## Review Notes
The WebFlux, Reactor `Mono`/`Flux`, functional endpoint, WebClient, Server-Sent Events, WebTestClient, and StepVerifier concepts are consistent with official Spring and Reactor documentation. The statement that WebClient replaces RestTemplate for non-blocking HTTP calls is acceptable in the reactive context; current Spring documentation also notes that `RestClient` is the modern synchronous option while `WebClient` is recommended for asynchronous and streaming scenarios.
