# Validation Summary: How to Set Up Human Review for Document AI Processing Results

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Document AI
- Document AI Human-in-the-Loop (HITL)
- Google Cloud IAM
- Google Cloud CLI
- Python
- Firestore

## Sources Consulted
- Google Cloud Document AI Human-in-the-Loop overview: https://docs.cloud.google.com/document-ai/docs/hitl
- Google Cloud Document AI IAM roles: https://docs.cloud.google.com/document-ai/docs/access-control/iam-roles
- Google Cloud Document AI Python sample, Request Human Review of a document: https://docs.cloud.google.com/document-ai/docs/samples/documentai-review-document
- Google Cloud Document AI Python API reference, ProcessRequest: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1.types.ProcessRequest
- Google Cloud Document AI Python API reference, ProcessResponse: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1.types.ProcessResponse
- Google Cloud Document AI Python API reference, HumanReviewStatus: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1.types.HumanReviewStatus
- Google Cloud Document AI REST reference, humanReviewConfig.reviewDocument: https://docs.cloud.google.com/document-ai/docs/reference/rest/v1/projects.locations.processors.humanReviewConfig/reviewDocument

## Issues Found
- The post is a 2026 setup guide for Google Cloud Document AI Human-in-the-Loop, but the official Google Cloud HITL overview states that Document AI Human-in-the-Loop is deprecated, new customers are not allowlisted, and the feature will no longer be available on Google Cloud after January 16, 2025. Because the post's main workflow depends on an unavailable/deprecated feature, it should not be published as a current technical setup guide.
- The prerequisite IAM role `roles/documentai.humanReviewReviewer` is not listed in the current official Document AI predefined IAM roles documentation. The current page lists Document AI Administrator, Editor, Viewer, and API User roles.
- The code samples omit the regional `api_endpoint` configuration shown in Google's current Python samples for Document AI locations, and the ad-hoc human review sample should use `client.human_review_config_path(...)` for the review config resource name.
- The "Process Documents with Human Review" section describes adding an empty `process_options=documentai_v1.ProcessOptions()` as enabling human review. The current `ProcessRequest` reference exposes `skip_human_review`; it does not require `process_options` to trigger human review.
- The README was not edited because the primary finding makes the article not technically relevant as a current setup guide rather than a correctable tutorial.

## Review Notes
- Local syntax/API import checks could not be run because `google-cloud-documentai` is not installed in this workspace. Verification was performed against official Google Cloud documentation.
