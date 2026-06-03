# Validation Summary: How to Set Up Amazon QLDB for Immutable Ledger

## Status
not-technically-relevant

## Post Type
Tutorial / setup guide

## Technologies Covered
- Amazon QLDB
- AWS CLI
- AWS IAM
- PartiQL
- Python
- pyqldb
- Amazon Ion
- Amazon Kinesis Data Streams
- Amazon CloudWatch

## Sources Consulted
- Amazon QLDB Developer Guide: Getting started cleanup page with end-of-support notice: https://docs.aws.amazon.com/qldb/latest/developerguide/getting-started-step-7.html
- Amazon QLDB Developer Guide: Overview, journal immutability, redaction, and cryptographic verification: https://docs.aws.amazon.com/qldb/latest/developerguide/what-is.overview.html
- Amazon QLDB Developer Guide: Verification concepts, SHA-256, digests, and Merkle proofs: https://docs.aws.amazon.com/qldb/latest/developerguide/verification.html
- Amazon QLDB Developer Guide: Querying revision history: https://docs.aws.amazon.com/qldb/latest/developerguide/working.history.html
- Amazon QLDB Developer Guide: Querying document metadata and `_ql_committed_` views: https://docs.aws.amazon.com/qldb/latest/developerguide/working.metadata.html
- Amazon QLDB Developer Guide: Managing indexes and indexed query requirements: https://docs.aws.amazon.com/qldb/latest/developerguide/working.manage-indexes.html
- AWS CLI Command Reference: `qldb create-ledger`: https://docs.aws.amazon.com/cli/latest/reference/qldb/create-ledger.html
- AWS CLI Command Reference: `qldb stream-journal-to-kinesis`: https://docs.aws.amazon.com/cli/latest/reference/qldb/stream-journal-to-kinesis.html
- Amazon QLDB Python driver documentation: https://amazon-qldb-driver-python.readthedocs.io/en/stable/guide/getting_started.html

## Issues Found
- Amazon QLDB is no longer a current AWS service for setup tutorials. AWS documentation states that existing customers could use Amazon QLDB only until end of support on July 31, 2025. This post is dated February 12, 2026 and presents QLDB as something readers can set up now, so the core tutorial is outdated and should not be published as current technical guidance.
- The statement that previous versions are preserved forever is incomplete. AWS documents a QLDB data redaction feature that can permanently remove user data from inactive document revisions while preserving journal integrity.
- The history query example uses `history(Accounts)` filtered by `data.accountId` and then prints `revision['version']`. AWS documents history records with metadata such as `metadata.id`, `metadata.version`, `metadata.txTime`, and a top-level `blockAddress`; the recommended pattern is to qualify history queries by document ID and time range.
- The cryptographic verification section says the block address comes from metadata. In QLDB system views, `blockAddress` is a top-level field alongside `metadata` and `data`.

## Review Notes
No README changes were made because the post is not salvageable as a current setup guide after QLDB's July 31, 2025 end-of-support date. Several individual CLI flags and API names in the post match the historical AWS CLI and pyqldb documentation, but the overall tutorial is no longer technically relevant for publication.
