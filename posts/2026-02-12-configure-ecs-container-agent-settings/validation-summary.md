# Validation Summary: How to Configure ECS Container Agent Settings

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon ECS
- ECS container agent
- Amazon EC2 container instances
- ECS-optimized AMIs
- CloudFormation launch templates
- Linux shell commands and user data

## Sources Consulted
- AWS: Amazon ECS container agent configuration: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-config.html
- AWS: Bootstrapping Amazon ECS Linux container instances to pass data: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/bootstrap_container_instance.html
- AWS: Turning on Amazon ECS container metadata: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/enable-metadata.html
- AWS: Amazon ECS task metadata endpoint version 4: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-metadata-endpoint-v4.html
- AWS: Task metadata available for Amazon ECS tasks on EC2: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ec2-metadata.html
- AWS: Network security best practices for Amazon ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/security-network.html
- AWS: Amazon ECS container introspection: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-introspection.html
- AWS: Amazon ECS EC2 container instances and agent log configuration: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-versions.html
- AWS: Configuring Amazon ECS Linux container instances to receive Spot Instance notices: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/spot-instance-draining-linux-container.html
- AWS: Access Amazon ECS features with account settings: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-account-settings.html
- AWS GitHub: Amazon ECS Agent README configuration parameters: https://github.com/aws/amazon-ecs-agent

## Issues Found
- The container metadata section used `ECS_ENABLE_TASK_ENI_METADATA`, which is not a documented ECS agent configuration variable. Replaced it with guidance that task metadata endpoint v4 is injected automatically on supported EC2 Linux agent versions, and changed the endpoint guidance to use `ECS_CONTAINER_METADATA_URI_V4`.
- The task metadata endpoint URL was shown as `http://169.254.170.2/v4/metadata`, which is not the documented v4 metadata access pattern. Updated the text to use the injected `ECS_CONTAINER_METADATA_URI_V4` environment variable.
- The task cleanup snippet included `ECS_TASK_CLEANUP_INTERVAL`, which is not a documented ECS agent setting. Replaced it with the documented `ECS_ENGINE_TASK_CLEANUP_WAIT_DURATION_JITTER`.
- The task cleanup snippet described `ECS_NUM_IMAGES_DELETE_PER_CYCLE` as a stopped-task retention setting. Removed it from the task cleanup snippet and left it in the image cleanup section, where it correctly applies.
- The image management snippet described `ECS_IMAGE_PULL_BEHAVIOR=default` as removing images above 80% disk usage. Corrected the comment because this setting controls image pull behavior, not disk threshold cleanup.
- The networking section described `ECS_ENABLE_TASK_ENI` and `ECS_AWSVPC_BLOCK_IMDS` as enabling awsvpc trunking. Corrected the comments because awsvpc trunking is an ECS account setting, while `ECS_ENABLE_TASK_ENI` enables task networking and `ECS_AWSVPC_BLOCK_IMDS` blocks instance metadata access for awsvpc tasks.
- Removed `ECS_DOCKER_BRIDGE_IP` from the networking snippet because it is not a documented current ECS agent configuration parameter.
- The logging section said `ECS_LOG_DRIVER` enabled audit logging for task state changes and that `ECS_DISABLE_METRICS=false` disabled anonymous usage data. Corrected the comments because `ECS_LOG_DRIVER` configures the agent container logging driver and `ECS_DISABLE_METRICS=false` keeps task metrics collection enabled.
- The resource reservation comments incorrectly described `ECS_RESERVED_MEMORY` as CPU reservation and `ECS_RESERVED_PORTS` as a memory percentage. Corrected both comments and clarified that `ECS_RESERVED_MEMORY` reduces memory reported for task placement.
- The security section used `ECS_DISABLE_INTROSPECTION`, which is not a documented ECS agent setting. Replaced it with `ECS_ALLOW_OFFHOST_INTROSPECTION_ACCESS=false`, which matches the documented ecs-init behavior for blocking off-host access to the agent introspection port.

## Review Notes
The post is now technically consistent with current AWS ECS agent documentation. Future improvements could mention that `ECS_ENABLE_SPOT_INSTANCE_DRAINING` is redundant when using Amazon ECS managed instance draining, but the setting remains valid for Spot interruption handling.
