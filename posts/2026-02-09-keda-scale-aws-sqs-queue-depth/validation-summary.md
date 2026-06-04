# Validation Summary: How to Use KEDA to Scale Based on AWS SQS Queue Depth

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- KEDA ScaledObject and TriggerAuthentication
- AWS SQS
- AWS IAM Roles for Service Accounts (IRSA)
- Kubernetes Horizontal Pod Autoscaler
- AWS CLI

## Sources Consulted
- KEDA AWS SQS Queue scaler documentation: https://keda.sh/docs/2.20/scalers/aws-sqs/
- KEDA ScaledObject specification: https://keda.sh/docs/2.20/reference/scaledobject-spec/
- KEDA authentication documentation: https://keda.sh/docs/2.19/concepts/authentication/
- KEDA AWS IRSA Pod Identity Webhook documentation: https://keda.sh/docs/2.20/authentication-providers/aws/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- AWS CLI get-queue-attributes reference: https://docs.aws.amazon.com/cli/latest/reference/sqs/get-queue-attributes.html
- Amazon SQS FIFO message group documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagegroupid-property.html

## Issues Found
- The post said KEDA handles querying CloudWatch and AWS SQS APIs for this scaler. KEDA's AWS SQS scaler uses SQS queue attributes, so the wording was changed to AWS SQS APIs.
- The post described the scaler as being able to monitor in-flight messages alone. Current KEDA SQS scaling uses visible messages alone or visible messages plus in-flight messages, so the explanation was corrected.
- The IRSA examples used `podIdentity.provider: aws-eks`, which KEDA documents as deprecated for removal in KEDA v3. The examples were updated to `podIdentity.provider: aws` with `identityOwner: workload`.
- The basic static-credential example included deprecated `identityOwner` trigger metadata with an inaccurate comment. That line was removed because it only applies to deprecated `aws-eks` authentication.
- The comprehensive scaler example included `scaleIfInFlight`, which is not a valid KEDA AWS SQS scaler metadata field. The invalid field was removed.
- The IRSA ScaledObject example used deprecated `identityOwner: pod` trigger metadata. That line was removed, with workload identity ownership kept in the TriggerAuthentication instead.
- The FIFO example said FIFO handles one message group at a time. AWS documents that FIFO queues process one message at a time within a message group, while different message groups can be processed in parallel. The comment and explanatory text were corrected.

## Review Notes
The YAML snippets were parsed successfully after the corrections. The AWS CLI command and Kubernetes HPA behavior fields match current official documentation.
