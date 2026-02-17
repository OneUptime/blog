# How to Use IAM Recommender to Remove Excess Permissions in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAM, Security, Permissions, Recommender

Description: A practical guide to using GCP IAM Recommender to identify and remove overly broad permissions, helping you enforce least-privilege access across your cloud projects.

---

One of the most common security mistakes in any cloud environment is granting too many permissions. A developer needs access to Cloud Storage, so someone gives them the Editor role on the whole project. A service account needs to read from BigQuery, so it gets BigQuery Admin. Over time, these excess permissions pile up and create a large attack surface that nobody remembers granting in the first place.

Google Cloud's IAM Recommender addresses this problem by analyzing actual permission usage and suggesting tighter role bindings. It watches what each principal actually does, compares that against what they are allowed to do, and then recommends a smaller set of roles that would still cover their real needs.

## How IAM Recommender Works

IAM Recommender is part of the Active Assist family of services in GCP. It uses machine learning models trained on permission usage patterns across your project. The recommender looks at 90 days of activity logs to determine which permissions a principal has actually exercised. If a service account has been granted the Storage Admin role but has only ever called `storage.objects.get` and `storage.objects.list`, the recommender will suggest replacing Storage Admin with a more limited role like Storage Object Viewer.

The recommendations fall into a few categories:

- **Replace role** - swap a broad role for a narrower one
- **Remove role** - remove a binding entirely if it was never used
- **Combine roles** - suggest a single custom role to replace multiple predefined roles

Each recommendation comes with a confidence level (low, moderate, high) and a priority ranking, so you can tackle the highest-impact changes first.

## Prerequisites

Before you start, make sure you have the following:

- A GCP project with IAM activity for at least 60 days (90 days gives the best recommendations)
- The `roles/recommender.iamViewer` role or equivalent permissions on your project
- The `gcloud` CLI installed and authenticated

You also need the Recommender API enabled on your project. Here is how to enable it:

```bash
# Enable the Recommender API for your project
gcloud services enable recommender.googleapis.com --project=my-project-id
```

## Listing IAM Recommendations

Once the API is enabled and you have sufficient activity history, you can list recommendations using gcloud. The following command retrieves all IAM recommendations for a specific project:

```bash
# List all IAM role recommendations for the project
gcloud recommender recommendations list \
  --project=my-project-id \
  --location=global \
  --recommender=google.iam.policy.Recommender \
  --format="table(name, description, stateInfo.state, priority)"
```

This returns a table showing each recommendation, its description, current state (ACTIVE, CLAIMED, SUCCEEDED, or FAILED), and priority level.

If you want more detail about a specific recommendation, use the describe command:

```bash
# Get full details of a specific recommendation
gcloud recommender recommendations describe RECOMMENDATION_ID \
  --project=my-project-id \
  --location=global \
  --recommender=google.iam.policy.Recommender
```

The output includes the exact role changes proposed, which principal is affected, and the operations needed to apply the recommendation.

## Understanding a Recommendation

Here is an example of what a recommendation looks like in JSON format:

```json
{
  "name": "projects/my-project-id/locations/global/recommenders/google.iam.policy.Recommender/recommendations/abc123",
  "description": "Replace the current role with a smaller role",
  "primaryImpact": {
    "category": "SECURITY",
    "securityProjection": {
      "details": {
        "revokedIamPermissionsCount": 1452
      }
    }
  },
  "content": {
    "operationGroups": [
      {
        "operations": [
          {
            "action": "remove",
            "resource": "//cloudresourcemanager.googleapis.com/projects/my-project-id",
            "pathFilters": {
              "/iamPolicy/bindings/*/role": "roles/editor",
              "/iamPolicy/bindings/*/members/*": "serviceAccount:my-sa@my-project-id.iam.gserviceaccount.com"
            }
          },
          {
            "action": "add",
            "resource": "//cloudresourcemanager.googleapis.com/projects/my-project-id",
            "pathFilters": {
              "/iamPolicy/bindings/*/role": "roles/storage.objectViewer",
              "/iamPolicy/bindings/*/members/*": "serviceAccount:my-sa@my-project-id.iam.gserviceaccount.com"
            }
          }
        ]
      }
    ]
  },
  "stateInfo": {
    "state": "ACTIVE"
  },
  "priority": "P1"
}
```

In this example, the recommender wants to remove `roles/editor` from a service account and replace it with `roles/storage.objectViewer`. That one change revokes 1,452 unnecessary permissions.

## Applying Recommendations

You can apply recommendations directly through gcloud. First, mark the recommendation as claimed so others know you are working on it:

```bash
# Mark the recommendation as claimed before applying
gcloud recommender recommendations mark-claimed RECOMMENDATION_ID \
  --project=my-project-id \
  --location=global \
  --recommender=google.iam.policy.Recommender \
  --etag=ETAG_VALUE \
  --state-metadata=reviewer=your-email@example.com
```

Then apply the actual IAM changes. For the example above, you would remove the old role and add the new one:

```bash
# Remove the overly broad role
gcloud projects remove-iam-policy-binding my-project-id \
  --member="serviceAccount:my-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/editor"

# Add the recommended narrower role
gcloud projects add-iam-policy-binding my-project-id \
  --member="serviceAccount:my-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

After applying, mark the recommendation as succeeded:

```bash
# Mark the recommendation as successfully applied
gcloud recommender recommendations mark-succeeded RECOMMENDATION_ID \
  --project=my-project-id \
  --location=global \
  --recommender=google.iam.policy.Recommender \
  --etag=ETAG_VALUE
```

## Automating the Process with Terraform

If you manage your IAM bindings with Terraform, you can use the Recommender API to generate Terraform-compatible changes. Google provides a tool called `policy-library` that can convert recommendations into policy-as-code formats.

For a more hands-on approach, you can query recommendations via the REST API and generate Terraform diffs:

```bash
# Fetch recommendations as JSON for scripting
gcloud recommender recommendations list \
  --project=my-project-id \
  --location=global \
  --recommender=google.iam.policy.Recommender \
  --format=json > recommendations.json
```

You can then write a script that parses the JSON and updates your Terraform `.tf` files to reflect the recommended role changes.

## Using the Console

If you prefer the web interface, you can find IAM Recommender suggestions in the Google Cloud Console. Navigate to **IAM & Admin > IAM**, and you will see recommendation icons next to principals that have overly broad roles. Clicking the icon shows the suggested change, and you can apply it with a single click.

The console also provides a project-wide view under **IAM & Admin > Recommendations** where you can see all active suggestions sorted by impact.

## Best Practices

Start with service accounts rather than user accounts. Service accounts tend to have the most consistent usage patterns, which means the recommendations are more accurate.

Focus on high-priority (P1 and P2) recommendations first. These typically involve principals with very broad roles like Editor or Owner that only use a small fraction of their permissions.

Review recommendations in a staging environment before applying them in production. Even though the recommender is usually accurate, there can be edge cases where a permission is used infrequently - like a disaster recovery process that only runs once a year.

Set up a regular cadence for reviewing recommendations. New ones appear as usage patterns change, and permissions that were appropriate six months ago might be excessive today.

Consider using organization-level recommendations if you manage multiple projects. The recommender works at the organization and folder levels too, giving you a broader view of excess permissions across your entire GCP estate.

## Monitoring and Alerting

You can set up alerts when new high-priority recommendations appear by using Cloud Monitoring. Create a metric-based alert that watches for new ACTIVE recommendations with P1 priority, and route notifications to your security team's Slack channel or email. This ensures that excess permissions are flagged promptly rather than sitting unnoticed for months.

IAM Recommender is one of the easiest wins for improving your GCP security posture. The analysis is automatic, the suggestions are specific, and the risk of breaking something is low when you follow a review-then-apply workflow. If you have not looked at your recommendations lately, there are probably a few hundred unnecessary permissions waiting to be cleaned up.
