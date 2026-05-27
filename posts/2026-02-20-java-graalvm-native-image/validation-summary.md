# Validation Summary: How to Build Native Images with GraalVM for Java Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- GraalVM Native Image
- Spring Boot
- Spring AOT and runtime hints
- Maven and GraalVM Native Build Tools
- Docker multi-stage builds
- Jackson
- JUnit / Spring Boot testing

## Sources Consulted
- GraalVM Native Image documentation: https://www.graalvm.org/jdk21/reference-manual/native-image/
- GraalVM Native Image options: https://www.graalvm.org/jdk24/reference-manual/native-image/overview/Options/
- GraalVM Community container images: https://www.graalvm.org/dev/getting-started/container-images/
- GraalVM Native Build Tools Maven plugin: https://graalvm.github.io/native-build-tools/latest/maven-plugin
- Spring Boot Maven plugin AOT documentation: https://docs.spring.io/spring-boot/maven-plugin/aot.html
- Spring Boot Native Image advanced topics: https://docs.spring.io/spring-boot/reference/packaging/native-image/advanced-topics.html
- Spring Framework RuntimeHintsRegistrar API: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/aot/hint/RuntimeHintsRegistrar.html
- Spring Framework RegisterReflectionForBinding API: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/aot/hint/annotation/RegisterReflectionForBinding.html
- SDKMAN GraalVM package page: https://sdkman.io/jdks/graal/

## Issues Found
- The Native Build Tools Maven plugin configuration used `<arg>` inside `<buildArgs>`. The official plugin syntax uses `<buildArg>`, so the snippet was corrected to use `<buildArg>` for each native-image option.
- The SDKMAN installation example pinned `21.0.5-graal` and described it as GraalVM CE. The `graal` SDKMAN distribution is Oracle GraalVM, not GraalVM CE, and the current JDK 21 GraalVM package line is newer. The example now uses `21.0.11-graal` and labels the expected version as Oracle GraalVM.
- The native test plugin snippet omitted the recommended `<extensions>true</extensions>` setting required by Native Build Tools for the JUnit Platform native test listener mode. The configuration was updated.
- The Jackson native-image fix said it registered Jackson types but only customized date/time serialization. The snippet now adds `@RegisterReflectionForBinding({Product.class, OrderResponse.class})` and clarifies that disabling `WRITE_DATES_AS_TIMESTAMPS` serializes dates as ISO-8601 strings rather than disabling a reflection feature.

## Review Notes
- The performance numbers in the post are plausible examples, but actual startup time, memory usage, binary size, and peak throughput vary by application, dependencies, JDK, build flags, operating system, and workload.
- The Docker example uses `ghcr.io/graalvm/native-image-community:21`, which is an official GraalVM Community container image tag for JDK 21. Using a more specific tag can improve reproducibility.
