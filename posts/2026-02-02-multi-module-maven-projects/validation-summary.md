# Validation Summary: How to Build Multi-Module Maven Projects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Maven (build tool, multi-module / reactor builds)
- Maven POM model 4.0.0
- Spring Boot 3.2.0 (via `spring-boot-dependencies` BOM)
- maven-compiler-plugin 3.11.0
- jacoco-maven-plugin 0.8.11
- Java 17
- Mermaid (diagrams)

## Sources Consulted
- Maven – Guide to Working with Multiple Modules: https://maven.apache.org/guides/mini/guide-multiple-modules.html
- Maven POM Reference (modelVersion, packaging, modules, dependencyManagement, pluginManagement, profiles): https://maven.apache.org/pom.html
- Maven Introduction to the Dependency Mechanism (BOM import, `scope=import`, `type=pom`): https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html
- Maven CLI options (`-pl/--projects`, `-am/--also-make`, `-P`, `-DskipTests`): https://maven.apache.org/ref/current/maven-embedder/cli.html
- Apache Maven Compiler Plugin 3.11.0 release: https://maven.apache.org/plugins/maven-compiler-plugin/
- Spring Boot `spring-boot-dependencies` BOM docs: https://docs.spring.io/spring-boot/docs/3.2.0/reference/html/using.html#using.build-systems.maven
- JaCoCo Maven Plugin 0.8.11 docs: https://www.jacoco.org/jacoco/trunk/doc/maven.html

## Issues Found
No technical issues found.

The XML schemas, BOM import pattern, parent/child POM inheritance, profile syntax, plugin versions and goal names (`prepare-agent`, `report`), and CLI flags all match official Maven and Spring Boot documentation.

## Review Notes
- The `maven-compiler-plugin` configuration uses `<source>` / `<target>`. This is correct and still supported, but on Java 9+ the recommended idiom is `<release>${java.version}</release>` which ensures both source level and target bytecode are aligned and prevents linking against newer JDK APIs. The current form is not wrong, just slightly dated.
- In the `dev` and `prod` profiles, `<skip.tests>` and `<log.level>` are user-defined properties. They will not by themselves skip tests or change log levels unless wired into surefire (e.g. `<skipTests>${skip.tests}</skipTests>`) or filtered into a resource file. The post presents them as illustrative properties rather than claiming they auto-wire, so this is acceptable but readers may need to do additional plumbing.
- maven-compiler-plugin 3.11.0 (April 2023) and jacoco 0.8.11 (October 2023) are valid but not the very latest; newer releases (3.13+ and 0.8.12+) exist. The post’s versions still work fine with Java 17 / Spring Boot 3.2.
- The line "Running `mvn install` from a child module won't pick up changes in sibling modules" is correct for an isolated child build; the canonical fix is `mvn -pl child -am install` from the root, which the post already covers earlier.
