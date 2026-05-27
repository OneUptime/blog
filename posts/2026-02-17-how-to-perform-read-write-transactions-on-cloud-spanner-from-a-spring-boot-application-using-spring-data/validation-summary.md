# Validation Summary: How to Perform Read-Write Transactions on Cloud Spanner from a Spring Boot App

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Spanner
- Spring Boot
- Spring Data Spanner / Spring Framework on Google Cloud
- Java
- Spring transactions

## Sources Consulted
- Google Cloud Spanner Spring Data integration documentation: https://cloud.google.com/spanner/docs/adding-spring
- Spring Framework on Google Cloud Spanner reference: https://googlecloudplatform.github.io/spring-cloud-gcp/5.13.2/reference/html/index.html
- Spring Data Cloud Spanner reference: https://googlecloudplatform.github.io/spring-cloud-gcp/reference/html/spanner.html
- Cloud Spanner transactions overview: https://cloud.google.com/spanner/docs/transactions
- Cloud Spanner transaction timeout documentation: https://cloud.google.com/spanner/docs/transaction-timeout
- Cloud Spanner Java client `TransactionContext` reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-spanner/latest/com.google.cloud.spanner.TransactionContext
- Spring Cloud GCP Spanner source for `SpannerTemplate` and `SpannerTransactionManager`: https://github.com/GoogleCloudPlatform/spring-cloud-gcp

## Issues Found
- The configuration snippet used `spring.cloud.gcp.project-id`; the Spring Data Spanner documentation lists the Spanner-specific project override as `spring.cloud.gcp.spanner.project-id`. Updated the property.
- The `TransactionLog` entity claimed to include getters and setters but only showed two getters. Added the missing accessors so the snippet is complete for normal Spring/Jackson usage.
- The `SpannerTemplate` transaction example called `readRow(Account.class, Key.of(...))`, but `SpannerTemplate` exposes `read(Class<T>, Key)` for entity reads. Updated both calls to `read(...)`.
- The post stated that `@Transactional` automatically retries aborted transactions and reruns the annotated method. Spring Cloud GCP's `SpannerTransactionManager` defines a transaction boundary but does not rerun the Java method body after an aborted commit. Updated the retry section to distinguish `@Transactional` from `SpannerTemplate.performReadWriteTransaction`, which delegates to the Spanner client transaction runner.
- The post described all read-write transactions as using two-phase commit. Spanner uses two-phase commit when needed, such as transactions spanning multiple splits. Updated the wording.
- The post stated a one-hour maximum transaction duration. The verified official behavior relevant here is the 10-second idle condition for read-write transactions; updated the text to avoid the unsupported maximum-duration claim.

## Review Notes
The examples are snippets and omit imports, schema DDL, and the `TransferRequest` DTO. Those omissions are acceptable for the post format, but a future revision could include a complete runnable sample or link to a repository.
