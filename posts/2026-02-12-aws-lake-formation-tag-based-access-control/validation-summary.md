# Validation Summary: How to Use AWS Lake Formation Tag-Based Access Control

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lake Formation
- Lake Formation tag-based access control (LF-TBAC)
- AWS CLI
- AWS Resource Access Manager (AWS RAM)
- Amazon Athena
- AWS CloudTrail

## Sources Consulted
- AWS Lake Formation: Lake Formation tag-based access control - https://docs.aws.amazon.com/lake-formation/latest/dg/tag-based-access-control.html
- AWS Lake Formation: Creating LF-Tags - https://docs.aws.amazon.com/lake-formation/latest/dg/TBAC-creating-tags.html
- AWS Lake Formation API Reference: LFTag - https://docs.aws.amazon.com/lake-formation/latest/APIReference/API_LFTag.html
- AWS Lake Formation: Assigning LF-Tags to Data Catalog resources - https://docs.aws.amazon.com/lake-formation/latest/dg/TBAC-assigning-tags.html
- AWS Lake Formation: Granting data lake permissions using the LF-TBAC method - https://docs.aws.amazon.com/lake-formation/latest/dg/granting-catalog-perms-TBAC.html
- AWS Lake Formation: Data sharing using tag-based access control - https://docs.aws.amazon.com/lake-formation/latest/dg/cross-account-TBAC.html
- AWS Lake Formation: Cross-account data sharing in Lake Formation - https://docs.aws.amazon.com/lake-formation/latest/dg/cross-account-permissions.html
- AWS Lake Formation: Updating cross-account data sharing version settings - https://docs.aws.amazon.com/lake-formation/latest/dg/optimize-ram.html
- AWS Lake Formation: Best practices and considerations for LF-Tags - https://docs.aws.amazon.com/lake-formation/latest/dg/lf-tag-considerations.html
- AWS General Reference: AWS Lake Formation endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/lake-formation.html
- AWS CLI Command Reference: lakeformation list-permissions - https://docs.aws.amazon.com/cli/latest/reference/lakeformation/list-permissions.html

## Issues Found
- The post said an account can have up to 50 LF-Tags and each tag can have up to 50 values. AWS current quotas document 1,000 LF-Tags per account and 1,000 values per LF-Tag, while a single API call supports 50 values. Updated the quota text accordingly.
- The cross-account LF-Tag sharing example omitted the grant option. AWS documentation states that LF-Tag permissions granted to an external account must include the grant option. Added `--permissions-with-grant-option`.
- The cross-account section implied that granting `DESCRIBE` and `ASSOCIATE` on LF-Tags alone gives the other account tag-expression data access. AWS documents this as a separate flow: first grant LF-Tag permissions, then grant database/table permissions using an LF-Tag policy expression with grant option. Updated the explanation without restructuring the section.
- The cross-account section described all LF-Tag sharing as using AWS RAM. AWS documentation distinguishes behavior by cross-account version settings; newer cross-account grants can use AWS RAM, while older LF-TBAC versions rely on Data Catalog resource policies. Updated the wording to avoid overgeneralizing.

## Review Notes
The AWS CLI examples use valid Lake Formation command names and JSON shapes for `create-lf-tag`, `add-lf-tags-to-resource`, `grant-permissions`, `list-permissions`, and `search-tables-by-lf-tags`. Column-level LF-Tag behavior, inheritance, AND/OR expression behavior, and the warning that only one value for a given LF-Tag key can be assigned to a resource are consistent with AWS documentation.
