# Validation Summary: How to Create Batch Cleanup

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Java
- Spring Batch
- Spring Framework scheduling
- Spring Boot configuration
- JDBC / JdbcTemplate
- PostgreSQL maintenance commands
- Micrometer
- Prometheus alert rules
- JUnit 5 / Spring Boot tests

## Sources Consulted
- Spring Batch metadata schema: https://docs.spring.io/spring-batch/reference/schema-appendix.html
- Spring Batch `JobExplorer` API: https://docs.spring.io/spring-batch/docs/5.1.0/org/springframework/batch/core/explore/JobExplorer.html
- Spring Batch `JobExecution` API: https://docs.spring.io/spring-batch/docs/current/api/org/springframework/batch/core/JobExecution.html
- Spring Batch `JobRepository` API: https://docs.spring.io/spring-batch/docs/5.1.0-SNAPSHOT/org/springframework/batch/core/repository/JobRepository.html
- Spring Framework cron expression API: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/scheduling/support/CronExpression.html
- Spring Boot common application properties: https://docs.spring.io/spring-boot/appendix/application-properties/index.html
- PostgreSQL `VACUUM` documentation: https://www.postgresql.org/docs/current/sql-vacuum.html
- PostgreSQL `ANALYZE` documentation: https://www.postgresql.org/docs/current/sql-analyze.html
- Micrometer timers documentation: https://docs.micrometer.io/micrometer/reference/concepts/timers.html
- Micrometer Prometheus registry documentation: https://docs.micrometer.io/micrometer/reference/implementations/prometheus.html
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/

## Issues Found
- The `BatchCleanupConfig` snippet referenced `JobRepositoryCleanupService` without importing it and included unused Spring Batch imports. Added the missing service import and removed the unused imports.
- The job repository cleanup snippet used `java.util.Date` for `JobExecution` start and end times. Spring Batch 5 exposes these values as `LocalDateTime`, so the cleanup code and tests were updated to use `LocalDateTime`.
- The cleanup service was both declared as a `@Bean` and annotated with `@Service`, which can create duplicate beans under component scanning. Removed `@Service` from the snippet because the configuration class creates the bean explicitly.
- The metadata deletion description omitted `BATCH_JOB_EXECUTION_PARAMS`. Updated the description and delete order comments to include job execution parameters before deleting the parent execution.
- The cleanup query used `findJobInstancesByJobName`, which is wildcard-oriented, even though the code already has exact job names. Replaced it with `getJobInstances`.
- The batch-size limit could be exceeded within a single job before the outer loop checked the limit. Passed the remaining delete count into the per-job cleanup method and stopped once the limit is reached.
- The staging cleanup tasklet hardcoded `status = 'PROCESSED'` for all staging tables, while the YAML showed different status rules and an audit table with no status filter. Updated the tasklet factory to accept optional status column/value filters.
- The PostgreSQL `VACUUM ANALYZE` tasklet was shown inside a Spring Batch transaction-wrapped tasklet, but PostgreSQL does not allow `VACUUM` inside a transaction block. Replaced the step with an `ANALYZE` step and updated the best-practice note to run vacuum operations outside transactional cleanup steps when needed.
- The sample `spring.scheduling.enabled` property is not a Spring Boot common application property. Removed it and noted that scheduling is enabled by `@EnableScheduling`.
- The Prometheus slow-cleanup alert queried a bare timer name. Updated it to use the Micrometer Prometheus timer max series, `batch_cleanup_duration_seconds_max`.
- The job-history growth alert referenced a metric not created in the post. Added a comment that the alert requires a `batch_job_execution_count` gauge.

## Review Notes
The examples now align with Spring Batch 5 style APIs. The post still uses illustrative table names and assumes the reader will adapt the staging-table configuration and indexes to their schema.
