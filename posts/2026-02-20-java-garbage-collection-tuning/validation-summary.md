# Validation Summary: How to Tune Java Garbage Collection for Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Java
- JVM garbage collection
- G1GC
- ZGC
- Parallel GC
- Shenandoah
- JVM unified logging
- JMX garbage collection notifications
- Micrometer JVM metrics
- Spring configuration

## Sources Consulted
- Oracle Java 17 `java` command documentation: https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html
- Oracle Java 17 G1 garbage collector documentation: https://docs.oracle.com/en/java/javase/17/gctuning/garbage-first-g1-garbage-collector1.html
- Oracle G1 garbage collector tuning guide: https://www.oracle.com/java/technologies/g1gc.html
- Oracle Java 21 Z Garbage Collector documentation: https://docs.oracle.com/en/java/javase/21/gctuning/z-garbage-collector.html
- Oracle Java 21 available collectors documentation: https://docs.oracle.com/en/java/javase/21/gctuning/available-collectors.html
- OpenJDK JEP 439, Generational ZGC: https://openjdk.org/jeps/439
- OpenJDK JEP 490, ZGC: Remove the Non-Generational Mode: https://openjdk.org/jeps/490
- Micrometer JVM metrics documentation: https://docs.micrometer.io/micrometer/reference/reference/jvm.html
- Spring Boot actuator metrics documentation: https://docs.spring.io/spring-boot/reference/actuator/metrics.html
- Java `GarbageCollectionNotificationInfo` API documentation: https://docs.oracle.com/en/java/javase/21/docs/api/jdk.management/com/sun/management/GarbageCollectionNotificationInfo.html

## Issues Found
- The G1GC pause-target comment said G1 adjusts region sizes to meet `MaxGCPauseMillis`. Region size is selected separately or ergonomically at startup; G1 primarily adjusts young generation sizing and collection sets for the soft pause goal. Updated the comment.
- The G1GC example set `ConcGCThreads=2` while saying concurrent marking threads are typically one quarter of `ParallelGCThreads`. With `ParallelGCThreads=4`, changed the example to `ConcGCThreads=1`.
- The G1GC example said to match `ParallelGCThreads` to CPU cores. The JVM chooses this ergonomically by default, so the wording was changed to make explicit setting conditional on measurement.
- The ZGC example used `-XX:+ZGenerational` as a Java 21+ flag. This is correct for Java 21-23, but JDK 24 made generational ZGC the default and obsoleted the flag. Updated the snippet to use only `-XX:+UseZGC` by default and mention the Java 21-23 flag as a conditional note.
- The ZGC comments said ZGC allocates additional memory for colored pointers. Colored pointers use metadata bits in object references; the practical overhead is from concurrent collection metadata. Updated the wording.

## Review Notes
The code examples are illustrative snippets and omit imports/package declarations, which is acceptable for a blog post. Spring Boot can auto-configure JVM Micrometer metrics when actuator dependencies are present, so the explicit `MeterBinder` beans are optional in many Spring Boot applications.
