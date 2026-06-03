# Validation Summary: How to Build a Search Engine with AWS OpenSearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon OpenSearch Service
- OpenSearch index mappings and analyzers
- OpenSearch query DSL
- OpenSearch JavaScript client
- AWS Signature Version 4 authentication
- AWS CDK
- AWS Lambda
- DynamoDB Streams
- CloudWatch metrics and alarms

## Sources Consulted
- AWS CDK `AdvancedSecurityOptions` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_opensearchservice.AdvancedSecurityOptions.html
- AWS CDK `ZoneAwarenessConfig` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_opensearchservice.ZoneAwarenessConfig.html
- OpenSearch JavaScript client documentation: https://docs.opensearch.org/latest/clients/javascript/index/
- OpenSearch `search_as_you_type` field documentation: https://docs.opensearch.org/latest/mappings/supported-field-types/search-as-you-type/
- OpenSearch multi-match query documentation: https://docs.opensearch.org/latest/query-dsl/full-text/multi-match/
- Amazon OpenSearch Service recommended CloudWatch alarms: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cloudwatch-alarms.html
- Amazon OpenSearch Service Index State Management documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ism.html

## Issues Found
- The index mapping referenced an `edge_ngram_analyzer` for the `title.autocomplete` multi-field, but no such analyzer was defined in the settings. I replaced this with a top-level `titleSuggest` field using the documented `search_as_you_type` type.
- The autocomplete query searched `title._2gram` and `title._3gram`, but those subfields are only created for a `search_as_you_type` field. I updated the query to use `titleSuggest`, `titleSuggest._2gram`, and `titleSuggest._3gram`.
- The indexing Lambda did not populate the autocomplete field after the mapping was corrected. I added `titleSuggest: newImage.title.S` to the indexed document.
- The price range filter used truthiness checks, so `minPrice=0` or `maxPrice=0` would be ignored. I changed the range filter checks to compare against `null`.

## Review Notes
The CDK, OpenSearch JavaScript client, SigV4 service name for Amazon OpenSearch Service, multi-match fuzziness usage, CloudWatch metric names, and Index State Management cost guidance are consistent with the official documentation consulted. The CDK snippet is still intentionally minimal and does not show Lambda IAM permissions, domain access policies, or fine-grained access control role mappings that a production deployment would need.
