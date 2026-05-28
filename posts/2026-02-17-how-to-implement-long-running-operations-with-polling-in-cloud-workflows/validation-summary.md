# Validation Summary: How to Implement Long-Running Operations with Polling in Cloud Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Workflows
- Google Cloud long-running operations
- Firestore export operations
- BigQuery Jobs API
- Workflows HTTP calls, expressions, subworkflows, sleep, logging, and parallel branches

## Sources Consulted
- Google Cloud Workflows syntax reference: https://docs.cloud.google.com/workflows/docs/reference/syntax
- Google Cloud Workflows expressions reference: https://docs.cloud.google.com/workflows/docs/reference/syntax/expressions
- Google Cloud Workflows expression helpers: https://docs.cloud.google.com/workflows/docs/reference/stdlib/expression-helpers
- Google Cloud Workflows maps reference: https://docs.cloud.google.com/workflows/docs/reference/syntax/maps
- Google Cloud Workflows parallel steps reference: https://docs.cloud.google.com/workflows/docs/reference/syntax/parallel-steps
- Google Cloud Workflows http.get reference: https://docs.cloud.google.com/workflows/docs/reference/stdlib/http/get
- Google Cloud Workflows connectors and LRO behavior: https://docs.cloud.google.com/workflows/docs/connectors
- Google Cloud Service Infrastructure LRO polling guide: https://docs.cloud.google.com/service-infrastructure/docs/polling-operations
- Firestore exportDocuments REST reference: https://docs.cloud.google.com/firestore/docs/reference/rest/v1/projects.databases/exportDocuments
- Firestore v1 REST discovery document: https://firestore.googleapis.com/$discovery/rest?version=v1
- BigQuery jobs.get REST reference: https://docs.cloud.google.com/bigquery/docs/reference/rest/v2/jobs/get
- BigQuery jobs.getQueryResults REST reference: https://docs.cloud.google.com/bigquery/docs/reference/rest/v2/jobs/getQueryResults
- BigQuery Job REST reference: https://docs.cloud.google.com/bigquery/docs/reference/rest/v2/Job
- BigQuery v2 REST discovery document: https://bigquery.googleapis.com/discovery/v1/apis/bigquery/v2/rest

## Issues Found
- BigQuery regional job polling was incomplete. The original BigQuery example submitted a job and then called `jobs.get` and `jobs.getQueryResults` without carrying a job location. Official BigQuery REST docs state the `location` query parameter must be specified for single-region jobs and jobs outside the `us` or `eu` multi-regions. I added a `location` workflow variable defaulting to `US`, included it in `jobReference`, passed it to the polling subworkflow, and sent it as the `location` query parameter on both polling and result retrieval calls.
- The parallel operations example said it started three export operations, but the snippet contains two branches. I changed the comment to say two export operations.

## Review Notes
- The post uses raw HTTP calls for LRO polling. This is technically valid, but Google Cloud Workflows connectors can also handle supported long-running operations with built-in polling and configurable `connector_params`.
- The BigQuery result example returns only the first page of query results. This is correct for a compact polling example, but production code should handle `pageToken` when all rows are required.
