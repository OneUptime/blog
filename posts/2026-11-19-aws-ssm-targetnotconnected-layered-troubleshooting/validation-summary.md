# Validation Summary: AWS SSM `TargetNotConnected`: Agent, IAM, Region, DNS, and Egress Checks

## Status
validated

## Post Type
Technical troubleshooting guide with AWS CLI commands and Linux diagnostic examples.

## Technologies Covered
- AWS Systems Manager, Session Manager, SSM Agent, and ssm-cli
- Amazon EC2, AWS STS, IAM instance profiles, and Default Host Management Configuration
- Amazon VPC, AWS PrivateLink, DNS, security groups, network ACLs, NAT, and VPC Block Public Access
- Bash, systemd, Ubuntu Snap, getent, curl, HTTPS, and proxy configuration
- Session logging and preferences involving Amazon S3, CloudWatch Logs, AWS KMS, and Run As

## Sources Consulted
- [AWS troubleshooting guidance](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-troubleshooting.html)
- [caller identity](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html)
- [EC2 lookup](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html)
- [managed-node lookup](https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-instance-information.html)
- [platform-specific service commands](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-status-and-restart.html)
- [agent log locations](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html)
- [Diagnostic checks](https://docs.aws.amazon.com/systems-manager/latest/userguide/troubleshooting-managed-nodes-using-ssm-cli.html)
- [Instance permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-instance-profile.html)
- [custom node role](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html)
- [Default Host Management Configuration](https://docs.aws.amazon.com/systems-manager/latest/userguide/fleet-manager-default-host-management-configuration.html)
- [caller policy examples](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html)
- [Message API and version behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-setting-up-messageAPIs.html)
- [Endpoint DNS requirements](https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html)
- [Systems Manager endpoint setup](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html)
- [curl options](https://curl.se/docs/manpage.html)
- [Agent proxy configuration](https://docs.aws.amazon.com/systems-manager/latest/userguide/configure-proxy-ssm-agent.html)
- [security group behavior](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html)
- [Network ACL behavior](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html)
- [Connection status](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-connection-status.html)
- [starting sessions](https://docs.aws.amazon.com/cli/latest/reference/ssm/start-session.html)
- [Run As requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-preferences-run-as.html)
- [AWS CLI: describe-vpc-endpoints](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpc-endpoints.html)
- [Linux getent manual: NSS lookup and ahostsv4](https://man7.org/linux/man-pages/man1/getent.1.html)
- [systemd systemctl manual](https://www.freedesktop.org/software/systemd/man/latest/systemctl.html)

## Issues Found
No technical issues found.

## Review Notes
- Reviewed all six troubleshooting layers against the linked AWS documentation. No changes to README.md were necessary.
- Confirmed the AWS CLI operations, global profile and Region options, target and instance selectors, filter capitalization, and response fields used by the JMESPath queries. The managed-node lookup correctly uses the current `--filters` option rather than the deprecated filter-list option.
- Checked all five Bash code blocks with `bash -n`; all passed. Reviewed the three JMESPath expressions against the documented response structures. The local Python environment did not have the JMESPath library, so those expressions were not executed locally.
- Confirmed the Linux agent service and log locations, Ubuntu Snap service name, and diagnostic command. AWS documents ssm-cli availability starting with agent 3.1.501.0.
- Verified the distinction between caller and node permissions, the minimal Session Manager channel actions, and the Default Host Management Configuration prerequisites: IMDSv2, agent 3.2.582.0 or later, and account/Region enablement. An instance profile permitting `ssm:UpdateInstanceInformation` takes precedence as described.
- Verified the 3.3.40.0 messaging endpoint preference and the restriction of ec2messages to Regions launched before 2024. The post appropriately scopes its endpoint examples to commercial AWS IPv4 names and calls out other partitions and IPv6-only deployments.
- Confirmed private DNS prerequisites, custom DNS forwarding, outbound HTTPS, endpoint security group ingress, stateful security group return traffic, and stateless network ACL return traffic. AWS troubleshooting guidance also identifies VPC Block Public Access as a possible connectivity cause.
- Reviewed curl option syntax and error handling. `--disable` is correctly placed first. The probe intentionally does not use `--fail`, so an HTTP error response can demonstrate transport progress without proving IAM authorization. The separate curl exit code, proxy caveat, and distinction between transport and session-channel health are accurate.
- Confirmed that get-connection-status reports Session Manager connection readiness, that CLI start-session requires the client-side plugin, and that an online heartbeat alone does not establish successful session operation. Logging, encryption, and Run As preferences can introduce additional dependencies.
- The technical reference URLs opened to the intended documentation. The author profile URL is a plausible attribution link, not a technical source.
- Validation consisted of documentation review and local Bash syntax checks. No AWS resources were changed, no live AWS session was started, and Linux agent/service commands were not executed on a target instance. Actual success depends on the reader replacing placeholders and using the documented permissions, tools, and network configuration.
