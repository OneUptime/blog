# Validation Summary: How to Use AWS Application Migration Service (MGN)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Application Migration Service (MGN)
- AWS CLI
- AWS IAM
- Amazon EC2 Launch Templates
- Amazon Route 53
- Python boto3

## Sources Consulted
- AWS CLI Command Reference: MGN initialize-service - https://docs.aws.amazon.com/cli/latest/reference/mgn/initialize-service.html
- AWS CLI Command Reference: MGN describe-source-servers - https://docs.aws.amazon.com/cli/latest/reference/mgn/describe-source-servers.html
- AWS CLI Command Reference: MGN update-launch-configuration - https://docs.aws.amazon.com/cli/latest/reference/mgn/update-launch-configuration.html
- AWS CLI Command Reference: MGN get-launch-configuration - https://docs.aws.amazon.com/cli/latest/reference/mgn/get-launch-configuration.html
- AWS CLI Command Reference: MGN start-test - https://docs.aws.amazon.com/cli/latest/reference/mgn/start-test.html
- AWS CLI Command Reference: MGN change-server-life-cycle-state - https://docs.aws.amazon.com/cli/latest/reference/mgn/change-server-life-cycle-state.html
- AWS CLI Command Reference: MGN terminate-target-instances - https://docs.aws.amazon.com/cli/latest/reference/mgn/terminate-target-instances.html
- AWS CLI Command Reference: MGN start-cutover - https://docs.aws.amazon.com/cli/latest/reference/mgn/start-cutover.html
- AWS CLI Command Reference: MGN finalize-cutover - https://docs.aws.amazon.com/cli/latest/reference/mgn/finalize-cutover.html
- AWS Application Migration Service User Guide: Linux agent installation - https://docs.aws.amazon.com/mgn/latest/ug/linux-agent.html
- AWS Application Migration Service User Guide: Windows agent installation - https://docs.aws.amazon.com/mgn/latest/ug/windows-agent.html
- AWS Application Migration Service User Guide: Configuring launch settings - https://docs.aws.amazon.com/mgn/latest/ug/configuring-target-gs.html
- AWS Application Migration Service User Guide: Launch template settings - https://docs.aws.amazon.com/mgn/latest/ug/launch-template.html
- AWS Service Authorization Reference: AWS Application Migration Service actions and managed permissions - https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsapplicationmigrationservice.html

## Issues Found
- The IAM setup example created a custom policy with an incomplete and brittle list of MGN agent permission-only actions. Replaced it with attachment of the AWS managed `AWSApplicationMigrationAgentInstallationPolicy`, which AWS documents for installing the replication agent.
- The placeholder source server ID `s-abc123` did not satisfy AWS MGN's documented `s-[0-9a-zA-Z]{17}` source server ID pattern. Replaced it with `s-0123456789abcdef0` in all CLI examples.
- The `update-launch-configuration` example used an unsupported `--ec2-launch-template-id` option. Removed that flag and kept only documented launch configuration options.
- The boolean options `--copy-private-ip false` and `--copy-tags true` used an invalid AWS CLI boolean flag style for this command. Replaced them with `--no-copy-private-ip` and `--copy-tags`.
- The EC2 launch template section implied that creating a separate launch template was how to configure MGN target launches. Updated it to retrieve the MGN-created launch template with `get-launch-configuration`, create a new EC2 launch template version, and set that returned version as default.
- The test completion section used `mark-as-archived`, which archives disconnected or cutover source servers and is not the correct way to mark a successful test. Replaced it with `change-server-life-cycle-state` to `READY_FOR_CUTOVER`, plus optional `terminate-target-instances` cleanup for the test instance.
- The `start-test` and `start-cutover` examples were adjusted to the documented AWS CLI list argument form for a single source server ID.

## Review Notes
The high-level MGN workflow, agent installer URLs, replication state names, test launch, cutover, finalize-cutover, and Route 53 examples are technically consistent with AWS documentation. The post still uses example static access keys in installer commands; they are AWS's documented placeholder values, but a future improvement would be to mention temporary credentials and `--aws-session-token` when using STS credentials.
