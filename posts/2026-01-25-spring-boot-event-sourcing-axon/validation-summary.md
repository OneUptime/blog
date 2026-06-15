# Validation Summary: How to Build Event-Sourced Apps with Axon in Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Spring Boot
- Java
- Axon Framework 4.9.3
- Event Sourcing
- CQRS
- JPA/Hibernate
- H2 Database
- Sagas
- Event upcasting
- Snapshotting
- JUnit 5 and Axon test fixtures

## Sources Consulted
- AxonIQ Docs: Spring Boot Integration - https://docs.axoniq.io/axon-framework-reference/4.12/spring-boot-integration/
- AxonIQ Docs: Event Bus & Event Store - https://docs.axoniq.io/axon-framework-reference/4.10/events/infrastructure/
- AxonIQ Docs: Event Processors - https://docs.axoniq.io/axon-framework-reference/4.11/events/event-processors/
- AxonIQ Docs: Streaming Event Processor configuration - https://docs.axoniq.io/axon-framework-reference/4.12/events/event-processors/streaming/
- AxonIQ Docs: Aggregate modeling - https://docs.axoniq.io/axon-framework-reference/5.1/commands/modeling/aggregate/
- AxonIQ Docs: Event versioning and upcasters - https://docs.axoniq.io/axon-framework-reference/5.1/events/event-versioning/
- AxonIQ Docs: Event snapshots - https://docs.axoniq.io/axon-framework-reference/5.0/tuning/event-snapshots/
- AxonIQ Docs: Commands/Events testing - https://docs.axoniq.io/axon-framework-reference/4.13/testing/commands-events/

## Issues Found
- The dependency and configuration snippets claimed to use a JPA-based event store, but `axon-spring-boot-starter` includes the Axon Server connector by default. Updated the Maven snippet to exclude `axon-server-connector` and added `axon.axonserver.enabled: false` so Spring Boot auto-configures the embedded JPA event store.
- The test section used `AggregateTestFixture` without including Axon's test artifact or Spring Boot's test starter. Added `axon-test` and `spring-boot-starter-test` test dependencies.
- The configured `account-processor` event processor would not necessarily apply to `AccountProjection` without assigning the projection to that processing group. Added `@ProcessingGroup("account-processor")`.
- Several code snippets used types without imports, which made them incomplete as Java examples. Added missing imports for command identifiers, `BigDecimal`, `Instant`, processing groups, upcaster support, and Spring configuration annotations.
- The upcaster example used `org.dom4j.Document`, which is appropriate for XML/XStream payloads but not for every serializer. Added a short note that the sample is XML/XStream-specific and added the missing `SimpleSerializedType` import.
- The aggregate tests used `any(Instant.class)` inside event constructors. That is not a valid Axon event assertion and would not match generated timestamps correctly. Replaced those assertions with Axon's `expectEventsMatching` and payload matchers that verify the deterministic fields and check that timestamps are present.
- The saga comment said the target account association was for the deposit event, but the deposit handler actually correlates by `transactionId`/`transferId`. Updated the comment to avoid implying the wrong association mechanism.

## Review Notes
- The article remains focused on Axon Framework 4.x. Axon Framework 5 changes several APIs and removes `@ProcessingGroup`, so future updates should either keep the article explicitly on Axon 4.x or add a separate migration note.
- The saga section is illustrative and references transfer completion/failure commands that would still need concrete aggregate or command handler implementations in a full application.
