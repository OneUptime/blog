# Validation Summary: How to Use Side Inputs in Apache Beam for Enrichment Lookups in Dataflow

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Beam
- Google Cloud Dataflow
- Java
- BigQueryIO
- TextIO
- Beam side inputs and windowing
- Cloud Bigtable Java client

## Sources Consulted
- Apache Beam Programming Guide: https://beam.apache.org/documentation/programming-guide/
- Apache Beam side input patterns: https://beam.apache.org/documentation/patterns/side-inputs/
- Apache Beam Java `View` Javadoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/transforms/View.html
- Apache Beam Java `GenerateSequence` Javadoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/io/GenerateSequence.html
- Google Cloud Dataflow out-of-memory troubleshooting: https://cloud.google.com/dataflow/docs/guides/troubleshoot-oom
- Google Cloud Dataflow pipeline options: https://cloud.google.com/dataflow/docs/reference/pipeline-options
- Cloud Bigtable Java `BigtableDataClient` reference: https://cloud.google.com/java/docs/reference/google-cloud-bigtable/latest/com.google.cloud.bigtable.data.v2.BigtableDataClient
- Cloud Bigtable Java `Row` reference: https://cloud.google.com/java/docs/reference/google-cloud-bigtable/latest/com.google.cloud.bigtable.data.v2.models.Row

## Issues Found
- Clarified that side inputs are materialized as views and may be cached by runners, instead of always saying the data lives in memory.
- Added the `View.asMap()` requirement that each key must have one value per window, with guidance to combine duplicates or use `View.asMultimap()`.
- Fixed the blocked-IP performance note. The original text suggested converting the side input to a `Set` in `@Setup`, but side inputs are only accessible while processing elements, not in `@Setup`.
- Corrected Dataflow side input size guidance. The original "under a few GB" statement was too broad; Dataflow streaming jobs without Streaming Engine store side inputs in worker memory, while Streaming Engine jobs have an 80 MB side input size limit.
- Updated the Bigtable example to use `client.readRow(TableId.of(TABLE_ID), event.getUserId())` instead of the deprecated `readRow(String, String)` overload, and adjusted the comment because the sample performs direct per-element lookups, not batched lookups.

## Review Notes
The slowly updating side input pattern is broadly aligned with Beam's documented approach, but production pipelines should pay close attention to window projection and trigger behavior because main input elements can see the latest side-input firing non-deterministically when using a global-window side input.
