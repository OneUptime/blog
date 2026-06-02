# Validation Summary: How to Stop, Start, and Terminate EC2 Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- Amazon EBS
- EC2 instance lifecycle states
- AWS CLI
- Amazon EventBridge
- AWS Instance Scheduler

## Sources Consulted
- Amazon EC2 User Guide: Amazon EC2 instance state changes - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html
- Amazon EC2 User Guide: Stop and start Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Stop_Start.html
- Amazon EC2 User Guide: How EC2 instance stop and start works - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-ec2-instance-stop-start-works.html
- Amazon EC2 User Guide: Reboot your Amazon EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-reboot.html
- Amazon EC2 User Guide: Terminate Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/terminating-instances.html
- Amazon EC2 User Guide: How instance termination works - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-ec2-instance-termination-works.html
- Amazon EC2 User Guide: Hibernate your Amazon EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Hibernate.html
- Amazon EC2 User Guide: Prerequisites for EC2 instance hibernation - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hibernating-prerequisites.html
- Amazon EC2 User Guide: Enable hibernation for an Amazon EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enabling-hibernation.html
- Amazon EC2 User Guide: Hibernate an Amazon EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hibernating-instances.html
- Amazon EC2 User Guide: Troubleshoot Amazon EC2 instance stop issues - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/TroubleshootingInstancesStopping.html
- Amazon EC2 User Guide: State change events for Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-instance-state-changes.html
- Amazon EC2 User Guide: Run commands when you launch an EC2 instance with user data input - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- AWS CLI Command Reference: stop-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/stop-instances.html
- AWS CLI Command Reference: start-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/start-instances.html
- AWS CLI Command Reference: reboot-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/reboot-instances.html
- AWS CLI Command Reference: terminate-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/terminate-instances.html
- AWS CLI Command Reference: modify-instance-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- AWS CLI Command Reference: run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: ec2 wait - https://docs.aws.amazon.com/cli/latest/reference/ec2/wait/
- AWS CLI Command Reference: describe-instance-status - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-status.html
- Instance Scheduler on AWS: Operator guide - https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/operator-guide.html
- Instance Scheduler on AWS: Schedule reference - https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/schedule-reference.html

## Issues Found
- The post said user data scripts may run again on start depending on configuration. AWS documents that user data scripts and cloud-init directives run only on initial launch by default, so this was clarified to say they usually do not run again unless configured to run on every boot.
- The termination billing bullet said billing stops after the instance enters the `terminated` state. AWS documents that instance usage charges stop when the instance reaches `shutting-down` or `terminated`, so the wording was corrected.
- The hibernation requirements said most instance types support hibernation. AWS documents hibernation support by supported instance family and additional prerequisites, so the wording was narrowed.
- The force-stop guidance used 15 minutes for a stuck `stopping` instance. AWS troubleshooting documentation uses 10 minutes before seeking AWS re:Post or Support help, so the threshold was corrected.
- The quick reference table implied hibernation billing simply stops. AWS documents that hibernated instances are billed while in `stopping` but not in `stopped`, so the table was clarified.
- The quick reference table said termination public IPs are released and billing stops. This was clarified to account for Elastic IP detachment and AWS's documented `shutting-down` billing transition.

## Review Notes
The local AWS CLI was not installed in the review environment, so CLI syntax was verified against the current AWS CLI v2 command reference rather than local `aws ... help` output. The article's AWS CLI commands and EC2 lifecycle explanations are otherwise consistent with current AWS documentation.
