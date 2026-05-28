# Validation Summary: How to Build a Study Plan for Passing Multiple GCP Certifications in Sequence

## Status
validated

## Post Type
Technical certification study guide

## Technologies Covered
- Google Cloud certifications
- Google Cloud certification exam guides and learning paths
- Google Cloud CLI (`gcloud`)
- Cloud Billing budgets and alerts
- Google Cloud services including Compute Engine, GKE, Cloud Run, App Engine, Cloud Storage, Cloud SQL, Firestore, VPC, IAM, Cloud Monitoring, Cloud Logging, BigQuery, Dataflow, Pub/Sub, Vertex AI, Cloud Build, Cloud Deploy, Cloud Armor, Cloud KMS, and Security Command Center

## Sources Consulted
- Google Cloud Certifications catalog: https://cloud.google.com/learn/certification?hl=en
- Associate Cloud Engineer certification page: https://cloud.google.com/learn/certification/cloud-engineer
- Cloud Digital Leader certification page: https://cloud.google.com/learn/certification/cloud-digital-leader
- Generative AI Leader certification page: https://cloud.google.com/learn/certification/generative-ai-leader
- Professional Cloud Architect certification page: https://cloud.google.com/learn/certification/cloud-architect/
- Professional Cloud Architect exam guide: https://cloud.google.com/learn/certification/guides/professional-cloud-architect
- Professional Workspace Administrator retired certification page: https://cloud.google.com/learn/certification/google-workspace-administrator/
- Cloud Billing budgets CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/billing/budgets/create
- Google Cloud Free Program documentation: https://docs.cloud.google.com/free/docs/free-cloud-features

## Issues Found
- The certification list was outdated. Added current Foundational and Associate certifications, replaced the retired Professional Workspace Administrator with Professional Security Operations Engineer, and kept the existing professional Google Cloud roles aligned with the current catalog.
- The post stated that every certification is valid for two years. Updated this because validity periods vary; professional certifications are valid for two years, while Cloud Digital Leader, Generative AI Leader, and Associate Cloud Engineer are listed as three years.
- The ACE resources and study plan referred to an official practice exam. Google Cloud certification pages refer to official sample questions, so the wording was changed to "sample questions."
- The PCA case study list included Dress4Win, which is no longer in the current official exam guide. Replaced it with the current case studies: EHR Healthcare, Helicopter Racing League, Mountkirk Games, and TerramEarth.
- The `gcloud billing budgets create` example used whole-number threshold percentages (`50`, `90`, `100`). The official CLI expects 1.0-based values between 0.0 and 1.0, so these were changed to `0.50`, `0.90`, and `1.00`.
- The maintenance section repeated the incorrect blanket two-year validity statement. Updated it to tell readers to check each certification's validity period.

## Review Notes
The overlap percentages and recommended timelines are author guidance rather than official exam guarantees. They are plausible as study-planning advice, but Google Cloud can change exam objectives and product names over time, so readers should check the current exam guide before scheduling.
