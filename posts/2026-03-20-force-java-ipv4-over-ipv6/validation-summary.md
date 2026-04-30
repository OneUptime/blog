# Validation Summary: How to Force Java to Use IPv4 Instead of IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Java
- JVM networking system properties
- IPv4
- IPv6
- Dual-stack networking
- Maven Surefire
- Gradle
- Spring Boot

## Sources Consulted
- Oracle JDK networking properties documentation: https://docs.oracle.com/en/java/javase/18/docs/api/java.base/java/net/doc-files/net-properties.html
- Oracle Java IPv6 guide: https://docs.oracle.com/javase/8/docs/technotes/guides/net/ipv6_guide/
- Oracle `InetAddress` API documentation: https://docs.oracle.com/en/java/javase/18/docs/api/java.base/java/net/InetAddress.html
- Oracle `Socket` API documentation: https://docs.oracle.com/en/java/javase/18/docs/api/java.base/java/net/Socket.html
- Apache Maven Surefire Plugin `argLine` documentation: https://maven.apache.org/surefire-archives/surefire-3.5.4/maven-surefire-plugin/test-mojo.html
- Gradle `JavaExec` DSL documentation: https://docs.gradle.org/current/dsl/org.gradle.api.tasks.JavaExec.html
- Spring Boot Maven Plugin reference (`jvmArguments`): https://docs.spring.io/spring-boot/docs/current/maven-plugin/reference/htmlsingle/

## Issues Found
- The post incorrectly said that the JVM prefers IPv6 during hostname resolution on dual-stack systems. I corrected this to match the official JDK behavior: Java uses an IPv6-capable socket by default when available, but prefers IPv4 addresses by default during name resolution.
- The post used `java.net.preferIPv4Addresses`, which is not a documented JVM networking property. I replaced that explanation with the correct companion property, `java.net.preferIPv6Addresses`, and clarified what it actually does.
- The post claimed these networking properties could be set reliably with `System.setProperty(...)` in application code and via Spring Boot `application.properties`. I removed that guidance and replaced it with startup-time JVM argument examples because the JDK documents these properties as being checked only once at JVM startup.
- The explicit IPv4 example was only a fragment and was not syntactically complete as shown. I rewrote it as a complete Java class with imports and a valid `main` method.
- The verification section implied that a simple hostname lookup was enough to prove IPv4 was forced. I changed it to inspect the active JVM properties and print resolved address families instead of overstating what the check proves.

## Review Notes
- Oracle also documents `java.net.preferIPv6Addresses=system` for preserving the system resolver order, but that setting is not necessary for the IPv4-focused scope of this post.
- A local JDK was not available in this environment, so the review relied on official documentation rather than executing the Java snippets.
