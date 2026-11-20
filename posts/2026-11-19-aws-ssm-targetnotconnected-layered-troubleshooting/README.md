# AWS SSM `TargetNotConnected`: Agent, IAM, Region, DNS, and Egress Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Session Manager, EC2, Troubleshooting

Description: Diagnose AWS SSM TargetNotConnected by checking account and Region, agent health, node and caller permissions, regional endpoints, DNS, and outbound HTTPS.

`TargetNotConnected` means Session Manager cannot connect to the requested managed node. AWS documents several causes, including incomplete configuration and a target in a different account or Region. Start by gathering evidence before changing policies. [AWS troubleshooting guidance](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-troubleshooting.html)

This sequence covers Linux EC2 instances and a standard shell session. Run AWS CLI commands on your workstation; run agent and network checks on the affected instance through an existing recovery path. An offline agent cannot reliably run its own repair through Run Command.

## 1. Pin the account, Region, and target

Replace these values and keep them consistent throughout the investigation:

```bash
ssm_profile='production'
ssm_region='us-east-1'
ssm_target='i-0123456789abcdef0'

aws --profile "$ssm_profile" --region "$ssm_region" sts get-caller-identity

aws --profile "$ssm_profile" --region "$ssm_region" ec2 describe-instances \
  --instance-ids "$ssm_target" \
  --query 'Reservations[].Instances[].{ID:InstanceId,State:State.Name,VPC:VpcId,Subnet:SubnetId,Profile:IamInstanceProfile.Arn}'

aws --profile "$ssm_profile" --region "$ssm_region" ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=$ssm_target" \
  --query 'InstanceInformationList[].{ID:InstanceId,Ping:PingStatus,LastPing:LastPingDateTime,Agent:AgentVersion}'
```

Confirm the STS `Account` and `Arn` belong to the intended environment. Check that EC2 reports the expected running instance before interpreting SSM results. These commands use the documented [caller identity](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html), [EC2 lookup](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html), and [managed-node lookup](https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-instance-information.html) APIs.

An empty SSM result after confirming the running target points toward registration or configuration. `ConnectionLost` and an old heartbeat point toward a node that stopped communicating. An `AccessDenied` response means the diagnostic caller lacks that API permission; it tells you nothing conclusive about agent health.

## 2. Check the agent on the instance

For a Linux package installation using systemd:

```bash
sudo systemctl status amazon-ssm-agent --no-pager
sudo tail -n 100 /var/log/amazon/ssm/amazon-ssm-agent.log
sudo ssm-cli get-diagnostics --output table
```

For Ubuntu Snap installations, use `snap.amazon-ssm-agent.amazon-ssm-agent.service` as the service name. Start a stopped agent with the command matching its installation method. AWS lists the [platform-specific service commands](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-status-and-restart.html) and [agent log locations](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html).

`ssm-cli` ships with agent version 3.1.501.0 and later; locate its installed binary if it is outside `PATH`. Its checks cover metadata access, credentials, endpoints, agent status, and proxy configuration. Interpret optional checks against the features you use: `ssmmessages` connectivity is required for Session Manager, while logging and encryption endpoints depend on your session preferences. [Diagnostic checks](https://docs.aws.amazon.com/systems-manager/latest/userguide/troubleshooting-managed-nodes-using-ssm-cli.html)

Preserve the relevant log timestamps. Credential retrieval failures, DNS errors, TLS errors, and HTTP authorization failures lead to different repairs.

## 3. Separate node permissions from caller permissions

For an instance-profile deployment, inspect the profile ARN from the EC2 output and the IAM role inside that profile. Compare its permissions with `AmazonSSMManagedInstanceCore` or your approved custom Session Manager policy. The Session Manager subset includes `ssm:UpdateInstanceInformation` and the four `ssmmessages` actions for creating and opening control and data channels. Attaching this policy to your workstation identity does not give the instance those permissions. [Instance permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-instance-profile.html), [custom node role](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html)

If the fleet uses Default Host Management Configuration, a missing instance profile is not automatically an error. Check the account/Region configuration, IMDSv2, and agent version 3.2.582.0 or later. An attached profile allowing `ssm:UpdateInstanceInformation` takes precedence over those default permissions. [Default Host Management Configuration](https://docs.aws.amazon.com/systems-manager/latest/userguide/fleet-manager-default-host-management-configuration.html)

Your caller separately needs `ssm:StartSession` for the target and applicable session document, plus channel and session-management permissions appropriate to its access method. Check tag conditions and explicit denies when authorization fails. Use AWS's [caller policy examples](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html) as the reference; node and caller roles serve different purposes.

## 4. Match endpoints to the Region and agent version

For standard commercial AWS endpoints, investigate `ssm.REGION.amazonaws.com` and `ssmmessages.REGION.amazonaws.com`. Agent 3.3.40.0 and later prefers `ssmmessages` when available. Older agents can also require `ec2messages`; that service is supported only in Regions launched before 2024. In newer Regions, update incompatible agents instead of trying to create a nonexistent endpoint. [Message API and version behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-setting-up-messageAPIs.html)

With PrivateLink, inspect the node's VPC endpoints:

```bash
ssm_vpc='vpc-0123456789abcdef0'
aws --profile "$ssm_profile" --region "$ssm_region" ec2 describe-vpc-endpoints \
  --filters "Name=vpc-id,Values=$ssm_vpc" \
  --query 'VpcEndpoints[].{Service:ServiceName,State:State,PrivateDNS:PrivateDnsEnabled,Groups:Groups[].GroupId}'
```

Check the relevant endpoints are available and private DNS is enabled. Private DNS requires both VPC DNS resolution and DNS hostnames. Custom resolvers need forwarding that resolves the service names through the VPC resolver. [Endpoint DNS requirements](https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html), [Systems Manager endpoint setup](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html)

## 5. Test DNS and outbound HTTPS from the node

On the instance, set its actual Region again. This example uses standard IPv4 endpoint names; use the appropriate endpoint configuration for other partitions or IPv6-only deployments. Include `ec2messages` in the loop when the agent and Region require it, as described above.

```bash
ssm_region='us-east-1'
for ssm_service in ssm ssmmessages; do
  ssm_endpoint="${ssm_service}.${ssm_region}.amazonaws.com"
  printf '\nEndpoint: %s\n' "$ssm_endpoint"
  getent ahostsv4 "$ssm_endpoint" || printf 'Local IPv4 lookup failed\n' >&2
  ssm_curl_status=0
  curl --disable --ipv4 --connect-timeout 5 --max-time 10 --silent --show-error \
    --output /dev/null --write-out 'HTTP status: %{http_code}\n' "https://${ssm_endpoint}/" \
    || ssm_curl_status=$?
  printf 'curl exit code: %s\n' "$ssm_curl_status"
done
```

Read each endpoint's output; the loop's final exit status is not a health verdict. `getent` follows local name-service configuration, including `/etc/hosts`. For PrivateLink, compare the resolved addresses with the endpoint network interfaces. Public answers suggest the expected private DNS path is not being used. A nonzero curl exit code needs investigation even if an HTTP status was printed. An HTTP error returned by the AWS endpoint for this unsigned root request can still demonstrate DNS, TCP, and TLS progress. It does **not** validate IAM authorization or a working messaging channel. A proxy-generated response only proves progress to the proxy. The curl probe uses its shell's proxy environment, which might differ from the agent service. [curl options](https://curl.se/docs/manpage.html)

Trace the actual path:

- For direct connections, the instance security group must permit outbound TCP 443 to the service endpoint. With a proxy, check the agent-to-proxy port and the proxy's onward HTTPS path. The agent initiates connections; opening inbound 22 or 443 on the instance does not fix this path. Check the agent's proxy configuration and IMDS bypass; Session Manager does not support HTTPS proxy servers. [Agent proxy configuration](https://docs.aws.amazon.com/systems-manager/latest/userguide/configure-proxy-ssm-agent.html)
- Interface endpoint security groups must allow inbound TCP 443 from the connecting instance or proxy. Security groups allow established return traffic automatically. [Systems Manager connectivity](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html), [security group behavior](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html)
- Network ACLs are stateless: check HTTPS and return ephemeral ports across the involved subnets. [Network ACL behavior](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html)
- For public endpoints, inspect the NAT/internet route, firewall, proxy, and VPC Block Public Access settings. For private endpoints, inspect endpoint policies if transport succeeds but agent API requests are denied. [AWS troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-troubleshooting.html)

Use the remaining symptom to choose the next evidence:

| Symptom | Next check |
| --- | --- |
| Agent runs, credential check fails | IMDS access and the effective node role |
| DNS resolves, connection times out | Routes, security groups, ACLs, and firewall logs |
| TLS succeeds, agent logs access denied | Denied action, node role, and endpoint policy |
| Heartbeat is online, sessions still fail | `ssmmessages` channel errors and session preferences |

## 6. Verify the session after repairing the failing layer

```bash
aws --profile "$ssm_profile" --region "$ssm_region" ssm get-connection-status \
  --target "$ssm_target"

aws --profile "$ssm_profile" --region "$ssm_region" ssm start-session \
  --target "$ssm_target"
```

`get-connection-status` checks Session Manager readiness. A successful session is the final verification; an `Online` heartbeat alone does not establish that every session dependency works. CLI sessions also require the local Session Manager plugin. [Connection status](https://docs.aws.amazon.com/cli/latest/reference/ssm/get-connection-status.html), [starting sessions](https://docs.aws.amazon.com/cli/latest/reference/ssm/start-session.html)

If the failure changes to a blank shell or logging/encryption error, investigate configured S3, CloudWatch Logs, KMS, or Run As requirements using the new error and agent logs. [Session troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-troubleshooting.html), [Run As requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-preferences-run-as.html) Record the failing layer, repair, and resulting connection status so the next incident starts with evidence.
