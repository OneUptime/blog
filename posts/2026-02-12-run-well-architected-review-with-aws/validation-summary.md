# Validation Summary: How to Run a Well-Architected Review with AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Well-Architected Framework
- AWS Well-Architected Tool
- AWS CLI
- Boto3 for Python
- AWS Well-Architected lenses and custom lenses
- AWS reliability, security, cost, performance, operational excellence, and sustainability practices

## Sources Consulted
- AWS CLI Command Reference: create-workload - https://docs.aws.amazon.com/cli/latest/reference/wellarchitected/create-workload.html
- AWS CLI Command Reference: list-answers - https://docs.aws.amazon.com/cli/latest/reference/wellarchitected/list-answers.html
- AWS CLI Command Reference: update-answer - https://docs.aws.amazon.com/cli/latest/reference/wellarchitected/update-answer.html
- AWS CLI Command Reference: list-lenses - https://docs.aws.amazon.com/cli/latest/reference/wellarchitected/list-lenses.html
- AWS CLI Command Reference: import-lens - https://docs.aws.amazon.com/cli/latest/reference/wellarchitected/import-lens.html
- AWS CLI Command Reference: create-milestone - https://docs.aws.amazon.com/cli/latest/reference/wellarchitected/create-milestone.html
- AWS Well-Architected Framework: The pillars of the framework - https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html
- AWS Well-Architected Tool API Reference: ListAnswers - https://docs.aws.amazon.com/wellarchitected/latest/APIReference/API_ListAnswers.html
- Boto3 WellArchitected client list_answers reference - https://docs.aws.amazon.com/boto3/latest/reference/services/wellarchitected/client/list_answers.html
- AWS Well-Architected Tool User Guide: Using lenses - https://docs.aws.amazon.com/wellarchitected/latest/userguide/lenses.html
- AWS Well-Architected Tool User Guide: Lens Catalog - https://docs.aws.amazon.com/wellarchitected/latest/userguide/lens-catalog.html

## Issues Found
- The CLI examples used `abc123` as a workload ID, but AWS Well-Architected workload IDs are fixed-length 32-character lowercase hexadecimal strings. Replaced it with a syntactically valid placeholder.
- The `update-answer` example used specific question and choice IDs that were not verified as current official Well-Architected Tool IDs. Changed the example to use `QuestionId` and `ChoiceId` values returned by `list-answers`.
- The operational excellence example heading said "Do you use infrastructure as code?" while the command answered a telemetry/state question. Updated the heading to match the question being answered.
- The risk list omitted `UNANSWERED`, which is a valid Well-Architected answer risk value. Added it to the risk categories.
- The Boto3 improvement-plan example did not handle pagination from `list_answers`, so it could miss answers. Added `NextToken` handling.
- The lens examples mixed lens aliases with an unverified lens alias. Changed the comments to list official lens names from the AWS Lens Catalog.
- The Multi-AZ quick win implied all databases can be fixed with one CLI command. Changed it to say to enable Multi-AZ or equivalent high availability where supported.
- The over-provisioning statement used a precise unsupported percentage. Replaced it with a general utilization-based statement.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against the current official AWS CLI command reference and API documentation instead of local `aws help` output. The Python snippet was syntax-checked with `python3`.
