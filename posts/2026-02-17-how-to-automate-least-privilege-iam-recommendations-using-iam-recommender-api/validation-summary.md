# Validation Summary: How to Automate Least Privilege IAM Recommendations Using IAM Recommender API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud IAM
- IAM Recommender
- Recommender API
- Google Cloud CLI
- Python Google Cloud client libraries
- Cloud Resource Manager API
- Cloud Functions
- Cloud Scheduler
- Pub/Sub

## Sources Consulted
- Google Cloud Policy Intelligence: Overview of role recommendations: https://docs.cloud.google.com/policy-intelligence/docs/role-recommendations-overview
- Google Cloud Policy Intelligence: Review and apply role recommendations for projects, folders, and organizations: https://docs.cloud.google.com/policy-intelligence/docs/review-apply-role-recommendations
- Google Cloud Recommender key concepts: https://docs.cloud.google.com/recommender/docs/key-concepts
- Google Cloud Recommender API usage guide: https://docs.cloud.google.com/recommender/docs/use-api
- Google Cloud SDK reference for `gcloud recommender recommendations list`: https://docs.cloud.google.com/sdk/gcloud/reference/recommender/recommendations/list
- Google Cloud Python client reference for `RecommenderClient`: https://docs.cloud.google.com/python/docs/reference/recommender/latest/google.cloud.recommender_v1.services.recommender.RecommenderClient
- Google Cloud Python client reference for Recommender `Operation`: https://cloud.google.com/python/docs/reference/recommender/latest/google.cloud.recommender_v1.types.Operation
- Google Cloud Python client reference for Resource Manager `ProjectsClient.get_iam_policy` and `set_iam_policy`: https://docs.cloud.google.com/python/docs/reference/cloudresourcemanager/latest/google.cloud.resourcemanager_v3.services.projects.ProjectsClient
- Google Cloud Scheduler cron jobs with Pub/Sub targets: https://docs.cloud.google.com/scheduler/docs/creating

## Issues Found
- The post said each recommendation includes a confidence level and that the sample script filters by confidence. The documented recommendation shape includes fields such as `priority`, `primaryImpact`, operation groups, state, and etag, but the shown script did not filter by confidence. I changed the text to refer to recommendation priority and security impact, and removed the inaccurate confidence filtering claim.
- The prerequisites listed only `roles/recommender.iamAdmin`. Applying the recommended IAM policy changes also requires permission to update the target resource's allow policy. I added an IAM admin prerequisite such as `roles/resourcemanager.projectIamAdmin` for project-level recommendations.
- The report script counted the number of projects with recommendations instead of the total number of recommendations. I changed `total_recommendations` to sum the recommendation counts across projects.
- The report script tried to read removed roles from `operation.value`, but documented IAM role recommendation remove operations identify the role and member in `path_filters`. I changed the parsing helpers to convert protobuf `Value` fields correctly and read removed roles from the path filters.
- The high-impact detection checked for `Editor` and `Owner`, but IAM role IDs are lowercase strings such as `roles/editor` and `roles/owner`. I changed the check to compare normalized role IDs.
- The auto-apply script assumed Resource Manager IAM policy calls could use the full `//cloudresourcemanager.googleapis.com/projects/...` resource name from the recommendation operation. The Python Resource Manager client expects `projects/{PROJECT_ID_OR_NUMBER}`. I added normalization before calling `get_iam_policy` and `set_iam_policy`.
- The auto-apply script assumed add/remove operations always used `value.get("role")` and `value.get("member")`. Recommender operations use protobuf `Value` and remove operations commonly use `path_filters`; add operations can include a binding with `members`. I added conversion helpers and updated the binding logic.
- The scheduling commands created a Scheduler job that published to a Pub/Sub topic without creating the topic first. I added a `gcloud pubsub topics create` command before deploying the function and scheduler job.

## Review Notes
The post is technically relevant and valid after the fixes. The local environment did not have `gcloud` or Google Cloud Python client libraries installed, so CLI and library behavior were verified against official Google Cloud documentation; Python code blocks were syntax-checked locally with `ast.parse`.
