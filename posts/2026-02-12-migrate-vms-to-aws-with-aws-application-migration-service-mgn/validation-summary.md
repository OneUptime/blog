# Validation Summary: How to Migrate VMs to AWS with AWS Application Migration Service (MGN)

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- AWS Application Migration Service (MGN)
- Amazon EC2 launch templates
- Amazon EBS staging volumes
- AWS Replication Agent
- Boto3 for Python
- PowerShell
- Linux shell commands

## Sources Consulted
- AWS Application Migration Service User Guide: Installing the AWS Replication Agent on Linux servers - https://docs.aws.amazon.com/mgn/latest/ug/linux-agent.html
- AWS Application Migration Service User Guide: Installing the AWS Replication Agent on Windows servers - https://docs.aws.amazon.com/mgn/latest/ug/windows-agent.html
- AWS Application Migration Service User Guide: Generating the required AWS credentials - https://docs.aws.amazon.com/mgn/latest/ug/credentials.html
- Boto3 MGN client reference: initialize_service - https://docs.aws.amazon.com/boto3/latest/reference/services/mgn/client/initialize_service.html
- Boto3 MGN client reference: describe_source_servers - https://docs.aws.amazon.com/boto3/latest/reference/services/mgn/client/describe_source_servers.html
- Boto3 MGN client reference: update_launch_configuration - https://docs.aws.amazon.com/boto3/latest/reference/services/mgn/client/update_launch_configuration.html
- Boto3 MGN client reference: get_launch_configuration - https://docs.aws.amazon.com/boto3/latest/reference/services/mgn/client/get_launch_configuration.html
- Boto3 MGN client reference: start_test - https://docs.aws.amazon.com/boto3/latest/reference/services/mgn/client/start_test.html
- Boto3 MGN client reference: change_server_life_cycle_state - https://docs.aws.amazon.com/boto3/latest/reference/services/mgn/client/change_server_life_cycle_state.html
- Boto3 MGN client reference: start_cutover - https://docs.aws.amazon.com/boto3/latest/reference/services/mgn/client/start_cutover.html
- Boto3 MGN client reference: finalize_cutover - https://docs.aws.amazon.com/boto3/latest/reference/services/mgn/client/finalize_cutover.html
- Boto3 MGN client reference: mark_as_archived - https://docs.aws.amazon.com/boto3/latest/reference/services/mgn/client/mark_as_archived.html
- Boto3 MGN client reference: disconnect_from_service - https://docs.aws.amazon.com/boto3/latest/reference/services/mgn/client/disconnect_from_service.html
- AWS Application Migration Service User Guide: Launch settings and launch templates - https://docs.aws.amazon.com/mgn/latest/ug/ec2-launch.html
- AWS Application Migration Service User Guide: Replication server settings and TCP port 1500 - https://docs.aws.amazon.com/mgn/latest/ug/replication-server-settings.html
- Amazon EC2 API Reference: CreateLaunchTemplateVersion - https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateLaunchTemplateVersion.html
- Amazon EC2 API Reference: ModifyLaunchTemplate - https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_ModifyLaunchTemplate.html

## Issues Found
- The Linux agent installer command used the old `.py` filename and ran it with `python3`. Updated it to the current documented `aws-replication-installer-init` download URL, added `chmod +x`, and executed the installer directly.
- The Windows installer URL used the shorter S3 hostname. Updated it to the region-qualified S3 URL documented for `us-east-1`.
- The credentials guidance said to use temporary credentials or an IAM role but did not mention the session token required for temporary credentials. Added that caveat.
- The replication lag example looked for `lagDuration` under a nested `dataReplicationInfo.dataReplicationInfo` object. Corrected it to `dataReplicationInfo.lagDuration`.
- The launch configuration example passed `ec2LaunchTemplateID` to `update_launch_configuration`, but that field is returned by the API and is not an input parameter. Removed it.
- The post-launch actions example used literal SSM `commands` parameters in the wrong MGN `postLaunchActions.ssmDocuments` shape. Simplified the example to valid post-launch action deployment and S3 logging settings.
- The target EC2 configuration example created an unrelated launch template. Updated it to fetch the MGN-created launch template ID, create a new EC2 launch template version, and set that version as the default.
- The test and cutover examples treated `start_test` and `start_cutover` responses as `items` lists. Updated them to use the documented `job.participatingServers` response shape.
- The post used non-existent `finalize_test` API calls. Replaced the test completion step with `change_server_life_cycle_state` to set the source server to `READY_FOR_CUTOVER`.
- The `finalize_cutover` and `mark_as_archived` examples used `sourceServerIDs` arrays, but the Boto3 methods require a singular `sourceServerID`. Corrected both calls.
- Several example source server IDs did not match the documented `s-` plus 17-character source server ID pattern. Replaced them with valid placeholder IDs.
- The sequence diagram implied the agent launches target instances. Updated it to show the MGN service launching test and cutover instances.
- The cutover explanation said MGN performs a final sync with a brief I/O pause. Reworded this to clarify that operators should stop or quiesce application writes and allow replication lag to drain before launch.

## Review Notes
The article is technically relevant and useful after correction. Future improvements could include a complete example for custom post-launch SSM documents and explicit wait/polling logic for launch jobs, but those are enhancements rather than correctness blockers.
