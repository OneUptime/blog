# Validation Summary: How to Use Spring Boot DevTools for Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Spring Boot 3.2.0 (Java 21)
- Spring Boot DevTools (automatic restart, LiveReload, property defaults, remote DevTools)
- Maven (`spring-boot-maven-plugin`) and Gradle (Groovy DSL and Kotlin DSL)
- Thymeleaf templating
- Spring Data JPA + H2 in-memory database
- LiveReload protocol (port 35729)
- IntelliJ IDEA, Eclipse / Spring Tool Suite, and VS Code IDE configuration
- Docker / docker-compose for containerised dev workflow

## Sources Consulted
- Spring Boot 3.2.x reference — "Developer Tools" section: https://docs.spring.io/spring-boot/docs/3.2.x/reference/html/using.html#using.devtools
- Spring Boot 3.2.x Maven Plugin reference (`repackage` / `excludeDevtools`): https://docs.spring.io/spring-boot/docs/3.2.x/maven-plugin/reference/htmlsingle/
- `DevToolsPropertyDefaultsPostProcessor` source on the 3.2.x branch: https://github.com/spring-projects/spring-boot/blob/3.2.x/spring-boot-project/spring-boot-devtools/src/main/java/org/springframework/boot/devtools/env/DevToolsPropertyDefaultsPostProcessor.java
- `RemoteDevToolsProperties` source on the 3.2.x branch: https://github.com/spring-projects/spring-boot/blob/3.2.x/spring-boot-project/spring-boot-devtools/src/main/java/org/springframework/boot/devtools/autoconfigure/RemoteDevToolsProperties.java
- Eclipse Project menu documentation (Build Automatically): https://help.eclipse.org/latest/topic/org.eclipse.platform.doc.user/reference/ref-59.htm
- VS Code "Spring Boot Tools" extension settings (`spring-boot.ls.java.home`)

## Issues Found
1. **Outdated `spring.resources.*` cache properties.** The "Default Property Overrides" listing included `spring.resources.cache.period=0` and `spring.resources.chain.cache=false` alongside the modern `spring.web.resources.*` variants. The `spring.resources.*` names were removed in Spring Boot 2.4, so they are not applied by `DevToolsPropertyDefaultsPostProcessor` in 3.2.x. Removed the two stale lines and kept only the `spring.web.resources.*` properties.
2. **Wrong Eclipse menu path for "Build Automatically."** The post pointed to "Window > Preferences > Java > Compiler," but the toggle actually lives at "Project menu > Build Automatically" (also reachable via "Window > Preferences > General > Workspace"). Corrected the path.
3. **Removed `spring.devtools.remote.debug.*` properties.** The post documented `spring.devtools.remote.debug.enabled` and `spring.devtools.remote.debug.local-port`. The remote debug tunnel was removed from Spring Boot DevTools in 3.0 — `RemoteDevToolsProperties` on the 3.2.x branch no longer contains a `Debug` nested class. These two lines were removed from the `application-remote.properties` snippet.
4. **Incorrect VS Code setting key.** The `settings.json` example used `spring-boot.ls.javahome` (no dot). The actual setting exposed by the Spring Boot Tools extension is `spring-boot.ls.java.home`. Corrected the key.

## Review Notes
- The Dockerfile.dev / docker-compose.dev.yml still expose port 8000 alongside 8080. This is fine as a generic JDWP/remote-debug placeholder, but with the DevTools remote debug tunnel removed in 3.0 it no longer corresponds to the `spring.devtools.remote.debug.local-port` mechanism described elsewhere in the post. Readers would need to add `-agentlib:jdwp=...` to `JAVA_TOOL_OPTIONS` for that port to be useful. Left as-is because the snippet remains technically valid as a generic JVM-debug exposure.
- The post recommends `excludeDevtools=true` on `spring-boot-maven-plugin`. That option is still present in 3.2.x and defaults to `true`, so the snippet is redundant but not incorrect.
- The remote DevTools feature itself is still available in Spring Boot 3.2.x, though it has been progressively deprecated in newer releases — readers targeting Spring Boot 3.4+ should consult the current reference before adopting the "Remote Development" workflow described here.
- The post mixes the older property `spring.devtools.restart.log-condition-evaluation-delta` with newer Spring Boot conventions; it remains valid in 3.2.x.
- Maven plugin command `-Dspring-boot.run.profiles=dev` is the current (2.2+) syntax; correct for 3.2.x.
