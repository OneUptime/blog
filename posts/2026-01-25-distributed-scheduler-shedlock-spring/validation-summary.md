# Validation Summary: How to Build a Distributed Scheduler with ShedLock in Spring

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Java
- Spring Boot
- Spring Framework scheduling with `@Scheduled`
- ShedLock
- JDBC lock provider
- PostgreSQL
- MySQL
- Redis
- JUnit 5
- Mockito

## Sources Consulted
- ShedLock official GitHub README: https://github.com/lukas-krecan/ShedLock
- ShedLock Redis Spring provider Javadoc index: https://javadoc.io/doc/net.javacrumbs.shedlock/shedlock-provider-redis-spring/latest/index.html
- Spring Framework `@Scheduled` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/scheduling/annotation/Scheduled.html
- Spring Boot Task Execution and Scheduling reference: https://docs.spring.io/spring-boot/reference/features/task-execution-and-scheduling.html
- Spring Boot Graceful Shutdown reference: https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html
- Redis `SET` command documentation: https://redis.io/docs/latest/commands/set/

## Issues Found
- Updated ShedLock dependency versions from `5.10.0` to `7.7.0`, matching the current official ShedLock documentation and latest provider Javadoc.
- Added the missing `org.springframework.jdbc.core.JdbcTemplate` import to the JDBC configuration snippet so `new JdbcTemplate(dataSource)` resolves correctly.
- Added the missing `java.util.List` import to the `ReportScheduler` snippet.
- Reworked the unit test example from `@SpringBootTest` with `@MockBean` to a Mockito unit test. ShedLock's current default Spring integration proxies scheduled methods, and ShedLock documents that locking is applied even when the method is called directly through the Spring bean. Constructing the scheduler with Mockito avoids ShedLock interference as the text intends.
- Replaced the long-running task example that autowired `LockProvider` but did not extend a lock with an example using `LockExtender.extendActiveLock(...)`, matching ShedLock's documented programmatic extension API.
- Corrected the missing table pitfall from "fails silently" to a more accurate troubleshooting note: JDBC locks cannot be acquired without the table, and ShedLock logs should be checked.
- Updated the Spring Boot scheduling link to the current reference documentation URL.

## Review Notes
- ShedLock 7.x requires Java 17 and is tested with recent Spring/Spring Boot versions. The post does not pin a Spring Boot version, so projects on older Spring Boot releases may need an older ShedLock line.
- ShedLock's Redis provider documentation notes that the classic Redis locking mechanism may not be reliable during Redis master failure; this is worth considering for highly available Redis deployments.
