# Validation Summary: How to Use the Go Cloud Spanner Client Library for Read-Write Transactions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Spanner
- Cloud Spanner Go client library (`cloud.google.com/go/spanner`)
- Google Cloud CLI (`gcloud spanner`)
- Go
- GoogleSQL DDL and DML
- Mermaid sequence diagrams

## Sources Consulted
- Cloud Spanner Go client library reference — https://docs.cloud.google.com/go/docs/reference/cloud.google.com/go/spanner/latest
- Cloud Spanner transactions overview — https://docs.cloud.google.com/spanner/docs/transactions
- Cloud Spanner transaction timeout documentation — https://docs.cloud.google.com/spanner/docs/transaction-timeout
- Cloud Spanner GoogleSQL DML syntax — https://docs.cloud.google.com/spanner/docs/reference/standard-sql/dml-syntax
- Cloud Spanner GoogleSQL timestamp functions — https://docs.cloud.google.com/spanner/docs/reference/standard-sql/timestamp_functions
- Cloud Spanner commit timestamp documentation — https://docs.cloud.google.com/spanner/docs/commit-timestamp
- Google Cloud CLI reference: `gcloud spanner instances create` — https://docs.cloud.google.com/sdk/gcloud/reference/spanner/instances/create
- Google Cloud CLI reference: `gcloud spanner databases create` — https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/create
- Cloud Spanner getting started with gcloud — https://cloud.google.com/spanner/docs/getting-started/gcloud

## Issues Found
- The setup schema did not include the `Active` and `LastLogin` columns used by the DML example. Added those columns to the `CREATE TABLE Users` DDL so the example matches the schema it tells readers to create.
- The batch insert snippet accepted `[]User` but did not define the `User` type. Added a small `User` struct with the fields used by the snippet.
- The read-write transaction example called `txn.BufferWrite` without checking its returned error. Updated the example to return the error if buffering mutations fails.
- The DML description implied DML is mainly better when writes depend on reads, but the post also correctly uses mutations inside a read-write transaction for read-dependent writes. Reworded the description to describe DML as useful for set-based SQL writes.
- The transaction rules described 60 seconds as a default deadline. The official Go documentation demonstrates setting a 60-second context timeout explicitly, so the rule now advises setting an explicit transaction timeout and notes that 60 seconds is a common sample value.

## Review Notes
- `gcloud` and `go` were not installed in the local environment, so CLI help and Go compilation could not be run locally. Commands and APIs were verified against official Google Cloud documentation instead.
- The Go examples use current Cloud Spanner Go client APIs such as `spanner.NewClient`, `Client.Apply`, `Client.ReadWriteTransaction`, `ReadWriteTransaction.ReadRow`, `ReadWriteTransaction.Update`, and `ReadWriteTransaction.BufferWrite`.
- The `CreatedAt` commit timestamp usage is valid because the column has `OPTIONS (allow_commit_timestamp=true)`.
