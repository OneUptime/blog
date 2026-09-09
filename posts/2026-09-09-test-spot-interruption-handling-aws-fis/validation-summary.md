# Validation Summary: How to Test Spot Interruption Handling with AWS FIS

## Status
validated

## Post Type
Tutorial / operational testing guide with AWS CLI commands and an experiment template in JSON.

## Technologies Covered
- AWS Fault Injection Service (AWS FIS)
- Amazon EC2 Spot Instances
- AWS Identity and Access Management (IAM)
- Amazon CloudWatch alarms
- Amazon EventBridge and EC2 instance metadata
- AWS CLI, Bash, JSON, and JMESPath
- Chaos engineering and application recovery verification

## Sources Consulted
- AWS FIS action reference: https://docs.aws.amazon.com/fis/latest/userguide/fis-actions-reference.html
- AWS FIS Spot interruption tutorial: https://docs.aws.amazon.com/fis/latest/userguide/fis-tutorial-spot-interruptions.html
- AWS FIS experiment options: https://docs.aws.amazon.com/fis/latest/userguide/experiment-options.html
- AWS FIS stop conditions: https://docs.aws.amazon.com/fis/latest/userguide/stop-conditions.html
- AWS FIS experiment IAM roles: https://docs.aws.amazon.com/fis/latest/userguide/getting-started-iam-service-role.html
- AWS FIS action behavior and rollback limitations: https://docs.aws.amazon.com/fis/latest/userguide/action-sequence.html
- Stopping an AWS FIS experiment: https://docs.aws.amazon.com/fis/latest/userguide/stop-experiment.html
- EC2 Spot interruption notices: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- AWS CLI create-experiment-template: https://docs.aws.amazon.com/cli/latest/reference/fis/create-experiment-template.html
- AWS CLI start-experiment: https://docs.aws.amazon.com/cli/latest/reference/fis/start-experiment.html
- AWS CLI list-experiment-resolved-targets: https://docs.aws.amazon.com/cli/latest/reference/fis/list-experiment-resolved-targets.html
- AWS CLI get-experiment: https://docs.aws.amazon.com/cli/latest/reference/fis/get-experiment.html
- AWS CLI stop-experiment: https://docs.aws.amazon.com/cli/latest/reference/fis/stop-experiment.html
- AWS CLI describe-instances: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html

## Issues Found
1. The manual stop command omitted the Region, although the experiment creation and execution commands explicitly use us-east-1. Added `--region us-east-1` so stopping the experiment works when the configured default Region is different or absent.
2. Target preparation allowed any running Spot Instance without excluding hibernation behavior. Added a prerequisite to use `terminate` or `stop`, explaining that hibernation begins immediately without a two-minute warning. This aligns the selected instance with the tutorial's warning-and-drain workflow and AWS's own tutorial prerequisite.

## Review Notes
- Confirmed the action ID, `aws:ec2:spot-instance` resource type, `SpotInstances` action target key, running-state filter, tag selection, and `COUNT(1)` against AWS's tutorial. Multiple matches are sampled randomly.
- Confirmed the two-to-fifteen-minute parameter range and ISO 8601 value `PT2M`, plus the documented EC2 action permissions and FIS role trust guidance.
- Confirmed template-level account targeting and empty-target options, start-time action modes, resolved-target listing, output query paths, and EC2 discovery filters against current AWS CLI documentation.
- Confirmed that previews skip actions, cannot establish action permissions, and may select different resources from a subsequent run.
- Confirmed CloudWatch alarm stop-condition syntax, interruption notifications through EventBridge and metadata, rebalance recommendation behavior, and the distinction between experiment completion and application recovery. Stopped instances require restart; termination is not reversible.
- All five AWS documentation links in the post resolved to the intended documentation. The author URL is an attribution link, not a technical source.
- Parsed the embedded JSON successfully and checked every fenced Bash example with `bash -n`. These are syntax checks, not execution tests.
- No live AWS experiments were run and no cloud resources were created or interrupted. Runtime success still depends on the reader's credentials, role policies, alarm, selected instance, and application recovery implementation.
- No deprecated APIs or version-specific incompatibilities were identified in the reviewed examples. Use an AWS CLI release that includes the documented preview options.
