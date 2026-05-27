# Validation Summary: How to Use Java Virtual Threads for High-Concurrency Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java virtual threads
- Project Loom
- Java structured concurrency
- Spring Boot virtual thread support
- Java HTTP Client
- Java Flight Recorder

## Sources Consulted
- Oracle Java SE 21 Thread API: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html
- Oracle Java SE 21 Virtual Threads guide: https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html
- Oracle Java SE 21 StructuredTaskScope API: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/StructuredTaskScope.html
- Oracle Java SE 26 Virtual Threads guide: https://docs.oracle.com/en/java/javase/26/core/virtual-threads.html
- OpenJDK JEP 491, Synchronize Virtual Threads without Pinning: https://openjdk.org/jeps/491
- Spring Boot 3.2 Reference Documentation, virtual threads and task execution: https://docs.spring.io/spring-boot/docs/3.2.x/reference/html/features.html

## Issues Found
- The structured concurrency section did not mention that `StructuredTaskScope` is a preview API in Java 21. Added a note that Java 21 code using it must be compiled and run with preview features enabled.
- The HTTP client example configured a virtual-thread executor directly on `HttpClient`, while the synchronous `send` calls are already run from virtual-thread tasks in the surrounding executor. Removed the unnecessary executor configuration and clarified the comment.
- The HTTP client example said results were collected "as they complete", but the code iterates through the `Future` list in submission order. Changed the comment to "Collect results."
- The virtual-thread anti-pattern section presented `synchronized` pinning as generally current behavior. Updated it to state that this applies to Java 21-23 and that Java 24+ removes normal `synchronized` pinning, while still discouraging long blocking work while holding locks.
- The performance diagram claimed approximately four carrier threads. Updated this to say the virtual-thread scheduler defaults carrier-thread parallelism to the number of available processors.
- The monitoring command used `-Djdk.tracePinnedThreads=short` without a version caveat. Updated the command to use JFR event printing and noted that `jdk.tracePinnedThreads` applies to Java 21-23 and has no effect on Java 24+.

## Review Notes
- The main virtual-thread creation APIs, Spring Boot `spring.threads.virtual.enabled` property, and JFR virtual-thread event names were verified against official documentation.
- Local Java tooling was not installed in the workspace, so snippets were reviewed against official APIs rather than compiled locally.
