# Validation Summary: How to Create ECR Lifecycle Policies with OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS Elastic Container Registry (ECR)
- ECR Lifecycle Policies
- AWS EventBridge / CloudWatch Events
- AWS SNS (referenced)
- Terraform AWS provider resources: `aws_ecr_lifecycle_policy`, `aws_ecr_repository`, `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`, `aws_sns_topic`

## Sources Consulted
- AWS ECR Lifecycle Policy Properties: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- AWS ECR Lifecycle Policy Examples: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html
- Amazon ECR EventBridge Events: https://docs.aws.amazon.com/AmazonECR/latest/userguide/ecr-eventbridge.html
- EventBridge Content-Based Filtering: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns-content-based-filtering.html
- Terraform AWS provider — `aws_ecr_lifecycle_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_lifecycle_policy
- Terraform AWS provider — `aws_cloudwatch_event_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- HCL2 specification (identifier grammar — hyphens allowed in continue characters)

## Issues Found

1. **Misleading comment in Basic Lifecycle Policy.** The original comment said "Keep last 30 production images tagged with git SHAs", but the rule uses `tagStatus = "any"`, which applies to all images regardless of tag. Updated the comment to "Keep the most recent 30 images regardless of tag status" to accurately describe the rule's behavior.

2. **Contradictory comment and description in Multi-Rule Policy Rule 1.** The comment said "Never expire images tagged as 'latest' or 'stable'" and the description said "Protect pinned tags", but the rule uses `imageCountMoreThan = 10` with the `expire` action — meaning images with these tags WILL be expired once there are more than 10. ECR lifecycle policies have no "keep" or "protect" action; only `expire` is supported. Updated the comment to "Keep the latest 10 images for pinned and version tags" and the description to "Keep last 10 pinned/versioned images" to accurately reflect the rule's behavior.

## Review Notes

- **Lifecycle policy schema verified.** All fields used (`rulePriority`, `description`, `selection.tagStatus`, `selection.tagPatternList`, `selection.countType`, `selection.countUnit`, `selection.countNumber`, `action.type`) match the AWS ECR lifecycle policy schema. Values used (`tagged`, `untagged`, `any`, `imageCountMoreThan`, `sinceImagePushed`, `days`, `expire`) are all valid.
- **`tagPatternList` patterns are valid.** AWS supports `*` as the only wildcard in tag patterns, with a maximum of 4 wildcards per pattern. The patterns used (`latest`, `stable`, `v*.*.*`, `rc-*`, `*`) all comply.
- **`tagStatus = "any"` rule placement is correct.** AWS requires a rule with `tagStatus = "any"` to have the highest `rulePriority` and be evaluated last. The Multi-Rule Policy correctly places Rule 4 (the `any` rule) at priority 4, the highest in the policy.
- **EventBridge event pattern verified.** The `detail-type = ["ECR Image Scan"]` and `source = ["aws.ecr"]` correctly match basic ECR scan events. The `detail.finding-severity-counts.CRITICAL` path is valid (note that the field is only present when findings exist for that severity, so `numeric > 0` filtering behaves correctly).
- **EventBridge numeric filter syntax verified.** `numeric = [">", 0]` is valid EventBridge content filter syntax.
- **HCL syntax verified.** Bare keys with hyphens like `detail-type` and `finding-severity-counts` are valid HCL2 identifiers (HCL2 grammar allows `-` in identifier continue characters). The unquoted form is consistent with conventions used in other posts in this blog.
- **Stylistic note (not changed):** The Multi-Rule Policy resource is named `services` but references `aws_ecr_repository.api.name`. This is technically valid but slightly inconsistent — it does not affect correctness.
- **Conceptual note (not changed):** ECR rules are evaluated in priority order (lowest first), and once an image is matched by a rule, subsequent rules are not evaluated against it. The post's rule ordering reflects this implicit behavior correctly.
