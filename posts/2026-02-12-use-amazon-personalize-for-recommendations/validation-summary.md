# Validation Summary: How to Use Amazon Personalize for Recommendations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Personalize
- AWS SDK for Python (Boto3)
- Amazon S3
- AWS IAM
- Amazon CloudWatch
- Machine learning recommendation systems

## Sources Consulted
- Amazon Personalize Developer Guide: Custom datasets and schemas - https://docs.aws.amazon.com/personalize/latest/dg/custom-datasets-and-schemas.html
- Amazon Personalize Developer Guide: Preparing item interaction data for training - https://docs.aws.amazon.com/personalize/latest/dg/interactions-datasets.html
- Amazon Personalize API Reference: CreateSolution - https://docs.aws.amazon.com/personalize/latest/dg/API_CreateSolution.html
- Amazon Personalize Developer Guide: User-Personalization-v2 recipe - https://docs.aws.amazon.com/personalize/latest/dg/native-recipe-user-personalization-v2.html
- Amazon Personalize Developer Guide: Choosing a recipe - https://docs.aws.amazon.com/personalize/latest/dg/working-with-predefined-recipes.html
- Boto3 documentation: Personalize create_dataset - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/personalize/client/create_dataset.html
- Boto3 documentation: Personalize create_solution - https://docs.aws.amazon.com/boto3/latest/reference/services/personalize/client/create_solution.html
- Boto3 documentation: Personalize create_solution_version - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/personalize/client/create_solution_version.html
- Boto3 documentation: Personalize create_campaign - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/personalize/client/create_campaign.html
- Boto3 documentation: Personalize Runtime get_recommendations - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/personalize-runtime/client/get_recommendations.html
- Boto3 documentation: Personalize Events put_events - https://docs.aws.amazon.com/boto3/latest/reference/services/personalize-events/client/put_events.html
- Amazon Personalize Developer Guide: Recording real-time events - https://docs.aws.amazon.com/personalize/latest/dg/recording-events.html
- Amazon Personalize CloudWatch metrics - https://docs.aws.amazon.com/personalize/latest/dg/cloudwatch-metrics.html
- Amazon Personalize pricing - https://aws.amazon.com/personalize/pricing/

## Issues Found
- The workflow text said there were four main stages while the diagram and list showed five. Changed it to five.
- The dataset section said Personalize works with three dataset types. Current Amazon Personalize supports additional dataset types, so the text now scopes the statement to item recommendation workflows.
- The sample interaction CSV could be read as a complete minimum training dataset, but User-Personalization-v2 requires at least 1,000 item interactions. Clarified that the CSV is a small excerpt and noted the minimum for the recipe used later.
- The recipe recommendation used the older `aws-user-personalization` recipe. Updated the table, recommendation, code, and wrap-up to use `aws-user-personalization-v2`, which AWS currently recommends for lower latency, larger item catalogs, and better relevance.
- The solution description called a solution a trained model. In Amazon Personalize, a solution is the training configuration and a solution version is the trained model. Updated the wording.
- The `create_solution` example configured `hpoObjective`, but AWS states that Amazon Personalize does not support configuring `hpoObjective` at this time. Removed the unsupported HPO configuration and used the v2 recipe ARN.
- The solution example used manual solution version creation but did not disable automatic training. Added `performAutoTraining=False` to keep the code aligned with the manual training flow and avoid unintended automatic training cost.
- The real-time events section said events are incorporated within about two seconds. AWS documents this as within seconds for recipes that support real-time personalization, so the wording was corrected.
- The pricing section described real-time inference as TPS-hour billing and training as per training hour only. Updated it for current pricing, including v2 recipe training per interaction ingested and inference per recommendation request with a minimum TPS charge for active campaigns.
- The batch inference recommendation said it is significantly cheaper. For v2 recipes, real-time and batch inference are both priced per recommendation request, so the wording now focuses on avoiding an always-active campaign when real-time recommendations are unnecessary.

## Review Notes
The code examples are still intentionally snippet-oriented. A production script should poll for ACTIVE status after creating asynchronous Amazon Personalize resources before using them in the next step.
