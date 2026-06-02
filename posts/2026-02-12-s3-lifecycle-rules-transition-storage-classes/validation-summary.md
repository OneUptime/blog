# Validation Summary: How to Set Up S3 Lifecycle Rules to Transition Objects Between Storage Classes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- S3 Lifecycle rules
- S3 storage classes
- AWS CLI `s3api`
- JSON lifecycle configuration payloads

## Sources Consulted
- AWS CLI Command Reference: `put-bucket-lifecycle-configuration` - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- AWS CLI Command Reference: `get-bucket-lifecycle-configuration` - https://docs.aws.amazon.com/cli/latest/reference/s3api/get-bucket-lifecycle-configuration.html
- Amazon S3 User Guide: Transitioning objects using Amazon S3 Lifecycle - https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- Amazon S3 User Guide: Understanding and managing Amazon S3 storage classes - https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html
- Amazon S3 User Guide: Examples of S3 Lifecycle configurations - https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configuration-examples.html
- Amazon S3 User Guide: Lifecycle configuration elements - https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- Amazon S3 User Guide: How S3 Intelligent-Tiering works - https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-overview.html

## Issues Found
- The post stated that S3 offers exactly seven storage classes. AWS currently documents additional storage classes, including S3 Express One Zone and Reduced Redundancy Storage. Changed the wording to "several storage classes" while keeping the lifecycle-focused table intact.
- The `logs/` lifecycle example transitioned to Standard-IA after 7 days and then Glacier Flexible Retrieval after 30 days. AWS requires objects to be stored for at least 30 days before Standard-IA, and a lifecycle rule cannot transition out of a storage class before that class's minimum storage duration has passed. Updated the transitions to 30 days and 60 days.
- The `backups/` lifecycle example transitioned from Glacier Instant Retrieval at day 14 to Deep Archive at day 90, which did not leave the object in Glacier Instant Retrieval for its 90-day minimum storage duration. Updated the Deep Archive transition to day 104.
- The non-current version example transitioned non-current versions to Standard-IA after 7 days and then to Glacier Instant Retrieval at 30 days. Updated the sequence to 30, 60, and 150 non-current days so the Standard-IA and Glacier Instant Retrieval timing constraints are respected.
- The explanation of non-current version retention implied the transition rules retained the three newest non-current versions. `NewerNoncurrentVersions` was only configured on expiration, so the text now explains that deletion happens after both the age threshold and newer-version threshold are exceeded.
- The small-object filter used `ObjectSizeGreaterThan: 131072`, but AWS object size filters are exclusive, so exactly 128 KB objects would not match. Updated the examples to `131071` and clarified that this includes objects at least 128 KB.
- The small-object constraint described only IA classes. AWS's current default lifecycle behavior prevents objects smaller than 128 KB from transitioning to any storage class, and IA plus Glacier Instant Retrieval have a 128 KB minimum billable object size. Updated the wording.
- The Intelligent-Tiering explanation said objects automatically move between archive tiers without noting that Archive Access and Deep Archive Access require separate configuration. Updated the text to distinguish automatic Archive Instant Access from optional archive tiers.

## Review Notes
AWS CLI was not installed in the local environment, so command verification was performed against the official AWS CLI command reference. The lifecycle JSON payloads in the post were extracted and parsed locally with Node.js after edits; all six payloads are valid JSON.
