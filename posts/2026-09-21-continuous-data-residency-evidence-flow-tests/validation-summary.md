# Validation Summary: How to Prove Data Residency with Cloud Evidence and Data-Flow Tests

## Status
validated

## Post Type
Technical guide with an internal JSON evidence record and a Python policy evaluator.

## Technologies Covered
- AWS Config advanced queries, resource recording, and multi-account/multi-region aggregators
- AWS IAM regional request conditions (`aws:RequestedRegion`)
- Amazon S3 replication and AWS Backup copy evidence
- Python standard-library datetime parsing and timezone-aware comparisons
- JSON evidence records, data residency controls, and synthetic data-flow testing

## Sources Consulted
- AWS Config — Querying the Current Configuration State of AWS Resources: https://docs.aws.amazon.com/config/latest/developerguide/querying-AWS-resources.html
- AWS Config — Creating Aggregators: https://docs.aws.amazon.com/config/latest/developerguide/aggregated-create.html
- AWS Config — Data Protection: https://docs.aws.amazon.com/config/latest/developerguide/data-protection.html
- AWS IAM — aws:RequestedRegion: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-requestedregion
- Amazon S3 API — GetBucketReplication: https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketReplication.html
- AWS Backup API — ListCopyJobs: https://docs.aws.amazon.com/aws-backup/latest/APIReference/API_ListCopyJobs.html
- AWS Well-Architected Framework — REL12-BP04 Test resiliency using chaos engineering: https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_testing_resiliency_failure_injection_resiliency.html
- Python — datetime, including fromisoformat, timedelta, timezone.utc, and aware/naive comparisons: https://docs.python.org/3/library/datetime.html
- Python — Built-in Types, including dictionaries, strings, and membership operations: https://docs.python.org/3/builtins/stdtypes.html
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- README.md required no changes. The post explicitly limits its conclusions to the observed resources and exercised paths and does not claim legal sufficiency or universal proof.
- Confirmed that AWS Config advanced queries operate on current recorded configuration for supported queryable resource types. Unrecorded resources are excluded, so missing results cannot establish resource absence.
- Confirmed that aggregators replicate configuration data from source accounts and regions. Checking the location and sensitivity of the evidence is appropriate; AWS also advises against sensitive information in tags and free-form name fields.
- Confirmed that aws:RequestedRegion controls the endpoint invoked, while operations such as S3 replication can affect other regions. Destination configuration and actual copy evidence are therefore relevant separate checks.
- Direct service APIs support the suggested supplementary collection: S3 exposes replication destinations, and AWS Backup exposes copy-job destinations, states, and pagination tokens. S3 documents propagation delays, supporting the instruction to check after convergence.
- Parsed the JSON example successfully. Its fields are correctly identified as an internal schema rather than provider configuration.
- Compiled and executed the exact Python example on Python 3.9.6. All 22 assertions passed, covering allowed and disallowed regions, collector failure, missing fields, malformed timestamps and region values, invalid allowlists, future and stale observations, the exact 24-hour boundary, equivalent timezone offsets, and a custom zero-length freshness window.
- The evaluator expects a dictionary-like normalized record as shown. It is not a general validator for arbitrary top-level input, and it does not authenticate observations or policy. These limits are consistent with the post's stated scope. Exactly max_age old observations pass; older observations return unknown.
- datetime.fromisoformat was introduced in Python 3.7. Replacing Z with +00:00 works on the tested interpreter and current Python; the example uses no deprecated APIs. No specific Python version is promised by the post.
- The three AWS documentation links and the author profile resolve to the intended resources. There are no terminal commands or provider-specific configuration snippets to validate.
- Synthetic markers and failure scenarios are implementation guidance. Their actual coverage depends on workload instrumentation and access to each destination. No live AWS workload, backup restore, vendor integration, or end-to-end data-flow test was performed during this review.
