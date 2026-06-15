# Validation Summary: How to Optimize Spring Boot for Production with JVM Tuning

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Spring Boot
- Java and HotSpot JVM
- JVM memory management
- Garbage collection: G1GC, ZGC, Shenandoah
- Kubernetes and Docker JVM deployment
- Spring Boot Actuator and Micrometer metrics
- Embedded Tomcat
- HikariCP
- GraalVM Native Image
- JMX

## Sources Consulted
- Oracle Java 21 GC Tuning Guide: Z Garbage Collector: https://docs.oracle.com/en/java/javase/21/gctuning/z-garbage-collector.html
- OpenJDK JEP 439: Generational ZGC: https://openjdk.org/jeps/439
- Oracle Java 17 Class Data Sharing documentation: https://docs.oracle.com/en/java/javase/17/vm/class-data-sharing.html
- Oracle Java command option documentation for RAM percentage and GC flags: https://docs.oracle.com/javase/8/docs/technotes/tools/unix/java.html
- Spring Boot Common Application Properties: https://docs.spring.io/spring-boot/appendix/application-properties/index.html
- Spring Boot 3 metrics export property migration notes: https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0.0-M3-Release-Notes
- GraalVM Native Build Tools Maven plugin documentation: https://graalvm.github.io/native-build-tools/latest/maven-plugin.html
- GraalVM Native Build Tools releases: https://github.com/graalvm/native-build-tools/releases

## Issues Found
- The Kubernetes example used `JAVA_OPTS`, which is not automatically consumed by the JVM unless the container entrypoint expands it. Changed it to `JAVA_TOOL_OPTIONS`, which the JVM launcher reads automatically.
- The ZGC command used `-XX:+ZGenerational` while labeling the example as Java 15+. Generational ZGC was delivered in JDK 21, so the example now says Java 21+.
- The ZGC heap-size claim used the older "8MB to 16TB" wording. Updated it to "a few hundred megabytes to many terabytes" to match current OpenJDK guidance.
- The Java thread-pool example used `ThreadPoolExecutor.CallerRunsPolicy` without importing `java.util.concurrent.ThreadPoolExecutor`. Added the missing import.
- The thread-stack comment stated that the default is always 1MB. Updated it to note that the default is platform-specific and often 1MB on 64-bit Linux.
- The CDS example mixed class-list dumping and archive creation in a way that is not a good fit for executable Spring Boot jars. Replaced it with a dynamic archive training run using `-XX:ArchiveClassesAtExit`, then loading it with `-XX:SharedArchiveFile`.
- The GraalVM Native Build Tools plugin version `0.9.28` was outdated. Updated it to `1.1.2`, the latest release found during review.
- The Prometheus metrics export property used the pre-Spring Boot 3 layout `management.metrics.export.prometheus.enabled`. Updated it to `management.prometheus.metrics.export.enabled`.

## Review Notes
Local Java/JDK commands could not be executed because `java` and `javac` are not installed in the review environment, so JVM flag validation was performed against official Oracle/OpenJDK documentation. The remaining tuning values are reasonable defaults or examples, but production sizing should still be validated under workload-specific load tests.
