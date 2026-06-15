# Validation Summary: How to Process Millions of Records with Spring Batch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Batch jobs, steps, chunk-oriented processing, readers, processors, and writers
- JDBC database readers and writers
- Flat file readers
- Spring Batch parallel processing and partitioning
- Spring Batch fault tolerance with skip and retry policies
- Micrometer-based Spring Batch observability

## Sources Consulted
- Spring Batch chunk-oriented processing reference: https://docs.spring.io/spring-batch/reference/step/chunk-oriented-processing.html
- Spring Batch scaling and parallel processing reference: https://docs.spring.io/spring-batch/reference/scalability.html
- Spring Batch `JdbcPagingItemReader` API documentation: https://docs.spring.io/spring-batch/docs/current/api/org/springframework/batch/item/database/JdbcPagingItemReader.html
- Spring Batch deprecated API list for `throttleLimit`: https://docs.spring.io/spring-batch/docs/current/api/deprecated-list.html
- Spring Batch item reader and writer implementations reference: https://docs.spring.io/spring-batch/reference/readers-and-writers/item-reader-writer-implementations.html
- Spring Batch `FlatFileItemReader` reference: https://docs.spring.io/spring-batch/reference/readers-and-writers/flat-files/file-item-reader.html
- Spring Batch Micrometer support reference: https://docs.spring.io/spring-batch/reference/spring-batch-observability/micrometer.html
- Spring Batch sample `ColumnRangePartitioner` API documentation: https://docs.spring.io/spring-batch/docs/2.2.x/spring-batch-samples/apidocs/org/springframework/batch/sample/common/ColumnRangePartitioner.html

## Issues Found
- The multi-threaded step example used `throttleLimit(8)`, which is deprecated in Spring Batch 5.x and scheduled for removal. Removed the call and relied on the pooled `TaskExecutor` configuration to bound concurrency.
- The text said each chunk is processed by a different thread and that the reader must be thread-safe. Current Spring Batch documentation describes `TaskExecutor` use as concurrent processor execution while reading and writing remain serial. Updated the explanation to describe the current behavior and to call out that concurrently invoked components must be thread-safe.
- The text described `JdbcPagingItemReader` as inherently thread-safe because page queries are independent. Its API documentation is more specific: it is thread-safe between `open` calls, and `saveState(false)` should be used in a multi-threaded client, which disables restart state for that reader. Updated the caveat accordingly.
- The partitioning example used `ColumnRangePartitioner` without noting that it is not a core Spring Batch production class; it appears in Spring Batch samples and is commonly implemented by applications. Clarified the code comment to say it is an application-provided `Partitioner` implementation.

## Review Notes
- The remaining code snippets use current Spring Batch builder-style APIs such as `JobBuilder(String, JobRepository)` and `StepBuilder(String, JobRepository)`.
- The post does not pin a Spring Batch version. The corrections were made against the current official Spring Batch documentation available on 2026-06-15.
