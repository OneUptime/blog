# Validation Summary: How to Build a Recommendation Engine with AWS Personalize

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Personalize
- AWS SDK for JavaScript v3
- AWS Lambda
- Amazon S3
- Amazon DynamoDB
- Personalize Runtime API
- Personalize Events API

## Sources Consulted
- Amazon Personalize custom dataset and schema requirements: https://docs.aws.amazon.com/personalize/latest/dg/custom-datasets-and-schemas.html
- Amazon Personalize item interaction data requirements: https://docs.aws.amazon.com/personalize/latest/dg/interactions-datasets.html
- Amazon Personalize User-Personalization recipe: https://docs.aws.amazon.com/personalize/latest/dg/native-recipe-new-item-USER_PERSONALIZATION.html
- Amazon Personalize dataset import jobs: https://docs.aws.amazon.com/personalize/latest/dg/bulk-data-import-step.html
- Amazon Personalize CreateDataset API: https://docs.aws.amazon.com/personalize/latest/dg/API_CreateDataset.html
- Amazon Personalize CreateCampaign API: https://docs.aws.amazon.com/personalize/latest/dg/API_CreateCampaign.html
- Amazon Personalize GetRecommendations API: https://docs.aws.amazon.com/personalize/latest/dg/API_RS_GetRecommendations.html
- Amazon Personalize CreateEventTracker API: https://docs.aws.amazon.com/personalize/latest/dg/API_CreateEventTracker.html
- Amazon Personalize PutEvents API: https://docs.aws.amazon.com/personalize/latest/dg/API_UBS_PutEvents.html
- OneUptime linked article: https://oneuptime.com/blog/post/2026-02-12-build-logging-and-monitoring-stack-on-aws/view

## Issues Found
- The post said Personalize needs interactions, items, and users datasets. For the custom User-Personalization flow shown, Amazon Personalize requires an Item interactions dataset; Items and Users datasets are optional metadata datasets. Updated the wording and diagram labels to make the optional datasets clear.
- The summary said Personalize works best with at least 1000 users and 1000 items. Amazon Personalize minimum training requirements are at least 1000 item interactions and 25 unique users with at least two item interactions each; for quality recommendations, AWS recommends at least 50,000 item interactions from 1000 users with two or more interactions each. Updated the summary to match the documented requirements.

## Review Notes
The JavaScript examples use current AWS SDK for JavaScript v3 command clients and the Personalize API field names match the documented APIs. AWS currently recommends the `aws-user-personalization-v2` recipe for new custom recommendation workloads, but the `aws-user-personalization` recipe used in the post remains documented and its hyperparameters match the official recipe documentation.
