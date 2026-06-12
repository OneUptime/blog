# Validation Summary: How to Create Item Writers

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Spring Batch item writers
- Spring Batch chunk-oriented processing
- JDBC and `JdbcBatchItemWriter`
- Flat file and JSON item writers
- JMS item writing
- Composite and classified item writers
- Spring Batch skip and retry configuration
- Elasticsearch Java API Client
- Spring Boot datasource/HikariCP configuration
- JUnit, Mockito, Spring Batch Test, and Testcontainers

## Sources Consulted
- Spring Batch Reference: ItemWriter - https://docs.spring.io/spring-batch/reference/readers-and-writers/item-writer.html
- Spring Batch Reference: Item reader and writer implementations - https://docs.spring.io/spring-batch/reference/readers-and-writers/item-reader-writer-implementations.html
- Spring Batch Reference: Scaling and parallel processing - https://docs.spring.io/spring-batch/reference/scalability.html
- Spring Batch Reference: Configuring skip logic - https://docs.spring.io/spring-batch/reference/step/chunk-oriented-processing/configuring-skip.html
- Spring Batch API: StepBuilder - https://docs.spring.io/spring-batch/reference/api/org/springframework/batch/core/step/builder/StepBuilder.html
- Spring Batch API: LimitCheckingItemSkipPolicy - https://docs.spring.io/spring-batch/reference/api/org/springframework/batch/core/step/skip/LimitCheckingItemSkipPolicy.html
- Spring Batch API: LimitCheckingExceptionHierarchySkipPolicy - https://docs.spring.io/spring-batch/reference/api/org/springframework/batch/core/step/skip/LimitCheckingExceptionHierarchySkipPolicy.html
- Spring Batch API: JdbcBatchItemWriter and JdbcBatchItemWriterBuilder - https://docs.spring.io/spring-batch/reference/api/org/springframework/batch/infrastructure/item/database/JdbcBatchItemWriter.html
- Spring Batch API: JmsItemWriter - https://docs.spring.io/spring-batch/reference/api/org/springframework/batch/infrastructure/item/jms/JmsItemWriter.html
- Spring Batch API: ClassifierCompositeItemWriter - https://docs.spring.io/spring-batch/reference/api/org/springframework/batch/infrastructure/item/support/ClassifierCompositeItemWriter.html
- Spring Framework API: JacksonJsonMessageConverter - https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/jms/support/converter/JacksonJsonMessageConverter.html
- Spring Framework API: MappingJackson2MessageConverter - https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/jms/support/converter/MappingJackson2MessageConverter.html
- Elastic documentation: Java High Level REST Client deprecation - https://www.elastic.co/guide/en/elasticsearch/client/java-rest/current/java-rest-high.html
- Elastic documentation: Java API Client bulk indexing - https://www.elastic.co/guide/en/elasticsearch/client/java-api-client/8.19/indexing-bulk.html
- Spring Framework API: DeadlockLoserDataAccessException - https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/dao/DeadlockLoserDataAccessException.html

## Issues Found
- The introduction described `ItemWriter` as receiving a list. Updated it to say it receives a chunk, matching the current Spring Batch `ItemWriter#write(Chunk<? extends T>)` API.
- The REST API writer could loop indefinitely on non-2xx responses if `RestTemplate` did not throw. Added attempt counting, retry delay, and an `ItemWriterException` after the retry limit.
- The JMS custom writer comment said it created a JSON message while the code created an `ObjectMessage`. Corrected the comment.
- The JMS custom writer attempted to set `JMSExpiration` directly. Replaced that with guidance to configure time-to-live through the template or producer because expiration is provider-managed.
- The JMS template example used deprecated `MappingJackson2MessageConverter`. Updated it to `JacksonJsonMessageConverter` for Spring Framework 7.
- The Elasticsearch writer used the deprecated `RestHighLevelClient`. Updated the example to use the current `ElasticsearchClient` and Java API Client bulk request/response APIs.
- The performance section used the deprecated Spring Batch 6 `chunk(size, transactionManager)` overload. Updated step examples to `chunk(size).transactionManager(transactionManager)`.
- The parallel writing example used a deprecated/incorrect multi-threaded step style for current Spring Batch behavior. Replaced it with a local chunking example using `ChunkTaskExecutorItemWriter`.
- The skip policy example used deprecated `LimitCheckingItemSkipPolicy` and deprecated `DeadlockLoserDataAccessException`. Updated it to `LimitCheckingExceptionHierarchySkipPolicy` and `PessimisticLockingFailureException`.

## Review Notes
Some examples are illustrative snippets and omit imports, bean dependencies, entity definitions, schema setup, and full application configuration. The performance timing table is plausible as an illustrative comparison, but actual results depend on database, network, driver, schema, indexes, and batch settings.
