# Validation Summary: How to Use Amazon CodeGuru Reviewer for Code Quality

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CodeGuru Reviewer
- Amazon CodeGuru Profiler
- AWS SDK for Python (boto3)
- AWS CodeCommit
- GitHub, GitHub Enterprise Server, and Bitbucket repository integrations
- GitHub Actions
- Amazon S3
- Amazon CloudWatch
- Java
- Python

## Sources Consulted
- Amazon CodeGuru Reviewer availability change: https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/codeguru-reviewer-availability-change.html
- What is Amazon CodeGuru Reviewer?: https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/welcome.html
- How Amazon CodeGuru Reviewer works: https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/how-codeguru-reviewer-works.html
- AssociateRepository API reference: https://docs.aws.amazon.com/codeguru/latest/reviewer-api/API_AssociateRepository.html
- CreateCodeReview API reference: https://docs.aws.amazon.com/codeguru/latest/reviewer-api/API_CreateCodeReview.html
- RecommendationSummary API reference: https://docs.aws.amazon.com/codeguru/latest/reviewer-api/API_RecommendationSummary.html
- PutRecommendationFeedback API reference: https://docs.aws.amazon.com/codeguru/latest/reviewer-api/API_PutRecommendationFeedback.html
- Create code reviews with GitHub Actions: https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/create-code-reviews.html
- Monitoring CodeGuru Reviewer with CloudWatch: https://docs.aws.amazon.com/codeguru/latest/reviewer-ug/monitoring.html
- Amazon CodeGuru Reviewer pricing: https://aws.amazon.com/codeguru/reviewer/pricing/
- aws-actions/codeguru-reviewer repository: https://github.com/aws-actions/codeguru-reviewer

## Issues Found
- The post presented CodeGuru Reviewer as available for new repository setup. AWS documentation says that, as of November 7, 2025, new repository associations cannot be created. Added a prominent caveat and revised setup, CI/CD, cost, and conclusion language to make clear the guide applies to existing repository associations.
- The association example was labeled as GitHub but used the `GitHubEnterpriseServer` repository type. Updated the text and comment to describe GitHub Enterprise Server, and added the official caveat that GitHub.com repositories could not be associated through the SDK or AWS CLI.
- The post said CodeGuru Reviewer models were trained on millions of code reviews. AWS documents this as millions of lines of Java and Python code from Amazon's code base and other sources, so the wording was corrected.
- The post gave a precise 5-15 minute review-time estimate that was not supported by the consulted AWS docs. Replaced it with a size-dependent completion statement.
- The GitHub Actions example used `aws-actions/codeguru-reviewer@v1`; official AWS docs and the action repository show `@v1.1`. Updated the workflow snippet.
- The pricing section described pricing as per-line analysis with the first 100K lines included in an associated repository fee. AWS pricing is a monthly fixed rate based on aggregate onboarded repository lines, with a 90-day free tier up to 100K lines and two full repository scans included per month per onboarded repository. Rewrote the bullets accordingly.
- The CloudWatch section implied metrics by recommendation type and feedback ratio. AWS documents `RecommendationsPublishedCount` by provider type, code review type, or repository name. Updated the bullets.

## Review Notes
The CodeGuru Reviewer API examples match the documented request and response shapes for existing associations, but the local environment did not have boto3/botocore installed for runtime validation. The GitHub Actions workflow remains illustrative; current AWS availability limits mean it is only appropriate for existing workflows or associations, not new CodeGuru Reviewer onboarding.
