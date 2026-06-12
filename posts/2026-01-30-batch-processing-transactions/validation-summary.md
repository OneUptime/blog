# Validation Summary: How to Build Batch Transactions

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Java
- Spring Framework transaction management
- Spring Batch chunk-oriented processing
- Spring Batch skip, retry, rollback, checkpoint, and restart behavior
- Spring Batch `JdbcPagingItemReader`
- JTA / XA distributed transactions
- Atomikos transaction management
- Saga pattern
- Micrometer metrics
- Mermaid diagrams

## Sources Consulted
- Spring Batch Reference: Chunk-oriented Processing - https://docs.spring.io/spring-batch/reference/step/chunk-oriented-processing.html
- Spring Batch Reference: Configuring a Step - https://docs.spring.io/spring-batch/reference/step/chunk-oriented-processing/configuring.html
- Spring Batch API: `StepBuilder` - https://docs.spring.io/spring-batch/reference/api/org/springframework/batch/core/step/builder/StepBuilder.html
- Spring Batch Reference: Configuring Skip Logic - https://docs.spring.io/spring-batch/reference/step/chunk-oriented-processing/configuring-skip.html
- Spring Batch Reference: Configuring Retry Logic - https://docs.spring.io/spring-batch/reference/step/chunk-oriented-processing/retry-logic.html
- Spring Batch Reference: Transaction Attributes - https://docs.spring.io/spring-batch/reference/step/chunk-oriented-processing/transaction-attributes.html
- Spring Batch Reference: Configuring a Job / Restartability - https://docs.spring.io/spring-batch/reference/job/configuring-job.html
- Spring Batch Reference: Configuring a Step for Restart - https://docs.spring.io/spring-batch/reference/step/chunk-oriented-processing/restart.html
- Spring Batch Reference: Item Processing / Filtering Records - https://docs.spring.io/spring-batch/reference/processor.html
- Spring Batch API: `JdbcPagingItemReader` - https://docs.spring.io/spring-batch/docs/5.1.0-RC1/org/springframework/batch/item/database/JdbcPagingItemReader.html
- Spring Batch Reference: Intercepting Step Execution / SkipListener - https://docs.spring.io/spring-batch/reference/step/chunk-oriented-processing/intercepting-execution.html
- Spring Framework API: `@Transactional` - https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/transaction/annotation/Transactional.html
- Spring Framework API: `JtaTransactionManager` - https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/transaction/jta/JtaTransactionManager.html
- Atomikos `AtomikosDataSourceBean` API - https://javadoc.io/doc/com.atomikos/transactions-jdbc/latest/com/atomikos/jdbc/AtomikosDataSourceBean.html
- Microservices.io: Saga Pattern - https://microservices.io/patterns/data/saga.html

## Issues Found
- The introduction implied a batch job "either complete fully or roll back cleanly", which is not accurate for chunk-level transaction processing where committed chunks remain committed. Changed it to say each transaction boundary commits or rolls back cleanly.
- The Spring Batch examples used the two-argument `chunk(size, transactionManager)` overload. That style works in Spring Batch 5.x but is deprecated for removal in Spring Batch 6. Updated the examples to the current `chunk(size).transactionManager(transactionManager)` style.
- The processor example described returning `null` from an `ItemProcessor` as skipping a record. Spring Batch documents this as filtering, which is distinct from skipping and does not increment skip counts. Updated the comments accordingly.
- The restartability example called `.preventRestart()` inside a snippet described as restartable. Spring Batch documents `.preventRestart()` as making a job non-restartable. Removed that call and clarified that jobs are restartable by default when relaunched after failure with the same identifying job parameters.
- The `JdbcPagingItemReader` bean called `SqlPagingQueryProviderFactoryBean#getObject()` without declaring `throws Exception`. Updated the bean method signature so the snippet compiles.
- The metrics listener incremented counters with cumulative `StepExecution` totals after each chunk, which would overcount records. Added previous-count tracking and incremented only the per-chunk delta.
- The skip-rate calculation divided by `readCount` without guarding zero reads. Added a zero-read guard.

## Review Notes
- The Spring Batch examples now use the non-deprecated Spring Batch 6 chunk builder style. The older two-argument overload is still available in Spring Batch 6 but is deprecated for removal.
- The sizing guidance is reasonable as a rule of thumb, but production chunk sizes should still be benchmarked against actual item cost, transaction resource behavior, lock contention, and restart requirements.
- The distributed transaction section is conceptually correct, but external APIs usually are not XA participants. The post already recommends Saga-style compensation when 2PC is unavailable.
