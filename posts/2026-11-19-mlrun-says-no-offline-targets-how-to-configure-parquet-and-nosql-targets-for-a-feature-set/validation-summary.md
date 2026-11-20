# Validation Summary: Fix MLRun 'No Offline Targets' with Parquet and NoSQL Feature Set Targets

## Status
validated

## Post Type
Technical troubleshooting guide with contextual Python examples.

## Technologies Covered
- MLRun feature sets and feature vectors
- Python and DataFrames
- Parquet offline feature storage
- Iguazio/V3IO NoSQL online feature storage
- Storey ingestion and transformation graphs

## Sources Consulted
- [MLRun feature-set implementation](https://docs.mlrun.org/en/stable/_modules/mlrun/feature_store/feature_set.html): target configuration, default engine, reload/save behavior, ingestion, and DataFrame retrieval.
- [MLRun target implementation](https://docs.mlrun.org/en/stable/_modules/mlrun/datastore/targets.html): target constructors, engine-specific path validation, status lookup, and V3IO driver selection.
- [MLRun sources and targets](https://docs.mlrun.org/en/stable/feature-store/sources-targets.html): offline and online storage roles and backend requirements.
- [MLRun feature-store API](https://docs.mlrun.org/en/stable/api/mlrun.feature_store/index.html): public APIs and feature-vector retrieval example.
- [MLRun datastore API](https://docs.mlrun.org/en/stable/api/mlrun.datastore/index.html): public target classes.
- [Author profile](https://github.com/nawazdhandala): verified the linked profile resolves.

## Issues Found
- **Missing ingestion-engine prerequisite:** The example supplies an unpartitioned Parquet directory and ingests a DataFrame into an existing feature set without specifying its engine. MLRun rejects that combination for the pandas engine with a non-chunked source. Updated the introductory sentence to explicitly require the default Storey engine (`engine="storey"`), for which the directory configuration is supported. No code or structural changes were needed.

## Review Notes
- Confirmed that ordinary feature-set reads select offline targets from `status.targets`, including matching an explicit target name, and raise the stated error when none matches. Passthrough reads follow a separate source-reading path.
- Confirmed that `set_targets` replaces the declared list and that `with_defaults=False` suppresses default additions. Reload updates the stored specification and status; saving configuration does not ingest historical records.
- Verified the target names, paths, constructor parameters, imports, and ingestion/read method signatures. No deprecated API usage was identified in the consulted stable documentation.
- Confirmed the distinct Parquet/offline and V3IO/key-based online roles and the documented `vector.get_offline_features().to_dataframe()` pattern.
- Recorded target status alone does not certify successful writes: target setup can record a created target before ingestion finishes. The post correctly also calls for inspecting logs and actual data.
- All three Python code blocks passed Python syntax parsing. The Mermaid diagram is consistent with the described data flow. There are no terminal commands to validate.
- All external links in the post resolved to the intended resources. The post does not pin an MLRun version; this review uses the available stable documentation.
- No live ingestion or storage integration test was performed. The examples require a configured feature set, compatible input data, MLRun database access, and writable authenticated Iguazio/V3IO destinations, as described in the post.
