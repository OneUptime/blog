# Validation Summary: How to Set Up AWS DataSync for Data Transfer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS DataSync
- AWS CLI
- Amazon S3
- Amazon EFS
- Amazon FSx for Windows File Server
- NFS
- SMB
- Amazon CloudWatch
- Amazon EventBridge schedule expressions

## Sources Consulted
- AWS DataSync User Guide: What is AWS DataSync? https://docs.aws.amazon.com/datasync/latest/userguide/what-is-datasync.html
- AWS DataSync User Guide: Activating your AWS DataSync agent https://docs.aws.amazon.com/datasync/latest/userguide/activate-agent.html
- AWS DataSync User Guide: Do I need an AWS DataSync agent? https://docs.aws.amazon.com/datasync/latest/userguide/do-i-need-datasync-agent.html
- AWS DataSync User Guide: AWS DataSync network requirements https://docs.aws.amazon.com/datasync/latest/userguide/datasync-network.html
- AWS DataSync User Guide: Scheduling when your AWS DataSync task runs https://docs.aws.amazon.com/datasync/latest/userguide/task-scheduling.html
- AWS CLI Command Reference: datasync create-agent https://docs.aws.amazon.com/cli/latest/reference/datasync/create-agent.html
- AWS CLI Command Reference: datasync create-location-nfs https://docs.aws.amazon.com/cli/latest/reference/datasync/create-location-nfs.html
- AWS CLI Command Reference: datasync create-location-smb https://docs.aws.amazon.com/cli/latest/reference/datasync/create-location-smb.html
- AWS CLI Command Reference: datasync create-location-s3 https://docs.aws.amazon.com/cli/latest/reference/datasync/create-location-s3.html
- AWS CLI Command Reference: datasync create-location-efs https://docs.aws.amazon.com/cli/latest/reference/datasync/create-location-efs.html
- AWS CLI Command Reference: datasync create-location-fsx-windows https://docs.aws.amazon.com/cli/latest/reference/datasync/create-location-fsx-windows.html
- AWS CLI Command Reference: datasync create-task https://docs.aws.amazon.com/cli/latest/reference/datasync/create-task.html
- AWS CLI Command Reference: datasync update-task https://docs.aws.amazon.com/cli/latest/reference/datasync/update-task.html
- AWS CLI Command Reference: datasync start-task-execution https://docs.aws.amazon.com/cli/latest/reference/datasync/start-task-execution.html
- AWS CLI Command Reference: datasync list-task-executions https://docs.aws.amazon.com/cli/latest/reference/datasync/list-task-executions.html
- AWS CLI Command Reference: datasync describe-task-execution https://docs.aws.amazon.com/cli/latest/reference/datasync/describe-task-execution.html
- AWS DataSync FAQ https://aws.amazon.com/datasync/faqs/

## Issues Found
- The activation key `curl` URL used `redirect_type=TEXT`, which is not the current documented AWS DataSync activation URL format. Updated it to include `gatewayType=SYNC`, `activationRegion`, and `no_redirect` for public service endpoint activation.
- The recurring transfer example used a CloudWatch Events/EventBridge rule with the DataSync task ARN as a direct target. AWS DataSync documents task schedules through the DataSync `--schedule` parameter on `create-task`, `update-task`, or `start-task-execution`. Replaced the example with `aws datasync update-task --schedule`.
- The troubleshooting note said ports 1024-1064 are for data transfer. AWS documents TCP 1024-1064 to a VPC service endpoint as control plane traffic; data plane traffic uses TCP 443 to the task network interfaces. Updated the note accordingly.

## Review Notes
The remaining AWS CLI examples use valid current DataSync command names, option names, and option values according to the AWS CLI reference. The EC2 agent launch example uses a placeholder AMI ID, so readers must replace it with the current DataSync agent AMI for their Region.
