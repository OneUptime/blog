# Validation Summary: How to Create Custom Spring Cloud Stream Binders

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Spring Cloud Stream
- Spring Cloud Stream Binder SPI
- Spring Boot auto-configuration
- Java
- Maven
- Spring Integration
- Spring Boot Actuator health indicators
- Micrometer metrics
- YAML configuration
- JUnit / Mockito testing

## Sources Consulted
- Spring Cloud Stream reference documentation: Implementing Custom Binders - https://docs.spring.io/spring-cloud-stream/reference/spring-cloud-stream/overview-custom-binder-impl.html
- Spring Cloud Stream reference documentation: Binder SPI - https://docs.spring.io/spring-cloud-stream/reference/spring-cloud-stream/overview-binder-api.html
- Spring Cloud Stream reference documentation: Binding Properties - https://docs.spring.io/spring-cloud-stream/reference/spring-cloud-stream/binding-properties.html
- Spring Cloud Stream reference documentation: Partitioning - https://docs.spring.io/spring-cloud-stream/reference/spring-cloud-stream/overview-partitioning.html
- Spring Cloud Stream reference documentation: Testing / Spring Integration Test Binder - https://docs.spring.io/spring-cloud-stream/reference/spring-cloud-stream/spring_integration_test_binder.html
- Spring Boot reference documentation: Creating Your Own Auto-configuration - https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html
- Spring Cloud Stream 4.1.0 artifact from Maven Central, inspected for relevant binder classes - https://repo1.maven.org/maven2/org/springframework/cloud/spring-cloud-stream/4.1.0/spring-cloud-stream-4.1.0.jar

## Issues Found
- The Maven example used Jakarta validation annotations but did not include validation support. Added `spring-boot-starter-validation`.
- The producer and consumer extended-property examples placed binder-specific settings under standard binding producer/consumer properties. Changed them to the documented `spring.cloud.stream.<binder-type>.bindings.<bindingName>...` path.
- The extended binding properties class only represented a single producer/consumer property pair and could not resolve per-binding settings. Reworked it to use `AbstractExtendedBindingProperties` with a per-binding `BinderSpecificPropertiesProvider` entry class.
- The provisioner returned an undefined `PartitionedProducerDestination`. Changed it to return the provided producer destination class, which already supports `getNameForPartition`.
- The producer handler threw `MessagingException` without importing it. Added the missing import.
- The partition-key logic ignored Spring Cloud Stream's standard `partitionKeyExpression`. Updated it to prefer the standard producer property, with the custom extension as a fallback.
- The partition calculation used `Math.abs(hash) % count`, which can be negative for `Integer.MIN_VALUE`. Replaced it with `Math.floorMod`.
- The consumer retry loop read retry settings from custom extension properties while the YAML configured standard Spring Cloud Stream consumer retry settings. Updated the loop to use `ExtendedConsumerProperties` retry values.
- The native-to-Spring message conversion attempted to call an instance `withPayload` method on `MessageBuilder`. Reworked the code to decompress before creating the builder.
- The binder called `setSendFailureChannel` on `AbstractMessageHandler`, which is not a valid API call. Removed the invalid call.
- The auto-configuration class used plain `@Configuration` for Boot 3 auto-configuration. Changed it to `@AutoConfiguration` and enabled both binder-level and extended binding properties.
- The binder registration section presented Spring Boot 2.x `spring.factories` registration before the Boot 3.x mechanism even though the project targets Boot 3.2 and Spring Cloud 2023. Reordered the guidance to make `AutoConfiguration.imports` primary and frame `spring.factories` as only for a separate Boot 2.x-compatible artifact.
- The usage YAML duplicated the `custommessaging` key, which would override one block in YAML parsers. Combined binder-level and extended binding settings into one `custommessaging` block.
- The consumer binding example used `orders-in-0`, but the `ordersIn` function bean conventionally binds to `ordersIn-in-0`. Updated the YAML and comment and added `spring.cloud.function.definition`.
- The simplified test sent a message to an unsubscribed output channel while asserting that the input subscriber received it. Changed the test to send to the subscribed `inputChannel`.
- The test snippet referenced custom producer and consumer property classes without imports. Added the missing imports.

## Review Notes
The article still uses placeholder types such as `CustomMessagingClient`, `NativeMessage`, `DestinationConfig`, and `CompressionUtils`, which is acceptable for a proprietary messaging-system tutorial but means the snippets are not a complete drop-in project without implementing those adapter classes. For future improvement, the testing section could use Spring Cloud Stream's `InputDestination` and `OutputDestination` test binder APIs for a more realistic binder/application test.
