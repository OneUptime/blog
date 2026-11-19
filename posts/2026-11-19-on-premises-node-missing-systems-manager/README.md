# On-Premises Node Missing from Systems Manager: Debug Hybrid Activation, Region, IAM Role, and Agent Registration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Hybrid Cloud, IAM, Troubleshooting

Description: Diagnose missing hybrid managed nodes by checking account and Region, activation capacity, service-role permissions, local registration, credentials, and connectivity.

A missing on-premises server can mean registration never completed, the console is showing another scope, or an existing node stopped communicating. Establish which case you have before changing its identity.

Run AWS CLI commands on an authorized workstation. The local examples target Linux with a package-installed agent and systemd; use an existing SSH or console connection for those checks.

## 1. Find the node in the correct account and Region

Hybrid-activated machines receive an `mi-` ID. An activation ID, hostname, and EC2 `i-` ID are different identifiers. Remove console filters for tags, online status, or EC2 resource type. A node with `Connection Lost` for at least 30 days might disappear from Fleet Manager's list until connectivity recovers. [Managed-node behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/fleet-manager-managed-nodes.html)

Replace the profile and Region with those used for activation:

```bash
ssm_profile='production'
ssm_region='us-east-1'

aws --profile "$ssm_profile" --region "$ssm_region" sts get-caller-identity

aws --profile "$ssm_profile" --region "$ssm_region" ssm describe-instance-information \
  --filters 'Key=ResourceType,Values=ManagedInstance' \
  --query 'InstanceInformationList[].{ID:InstanceId,Host:ComputerName,Ping:PingStatus,LastPing:LastPingDateTime,Activation:ActivationId,Role:IamRole}' \
  --output table
```

Verify the returned account first. The query includes offline nodes and avoids tag filters; leave CLI pagination enabled. If you know the `mi-` ID, substitute `Key=InstanceIds,Values=mi-0123456789abcdef0` for the resource-type filter. [Caller identity](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html), [lookup fields and filters](https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-instance-information.html)

`AccessDenied` is a diagnostic-caller failure, not evidence that registration failed. An empty successful result requires checking the original registration account and Region against local evidence.

## 2. Check activation eligibility for first registration

Use the activation ID from your deployment records, keeping the code secret:

```bash
ssm_activation_id='11111111-2222-3333-4444-555555555555'

aws --profile "$ssm_profile" --region "$ssm_region" ssm describe-activations \
  --filters "FilterKey=ActivationIds,FilterValues=$ssm_activation_id" \
  --query 'ActivationList[].{ID:ActivationId,Role:IamRole,Expired:Expired,Expires:ExpirationDate,Used:RegistrationsCount,Limit:RegistrationLimit}' \
  --output table
```

Notice `RegistrationsCount`, with an **s**, and the different filter syntax from the node query. This operation returns activation metadata, not the activation code. [DescribeActivations reference](https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-activations.html)

For a new registration, the activation must exist in the intended Region, remain unexpired, and have `RegistrationsCount < RegistrationLimit`. An empty response can mean the wrong account/Region or a deleted activation; check the deployment record before creating another.

**Activation expiry does not disconnect previously registered nodes.** The default registration window is 24 hours, configurable up to 30 days; the default registration limit is one. If a new machine exhausted that window or capacity, create another activation with the intended role and sufficient capacity. Store its code securely, outside tickets and logs. [Activation lifecycle](https://docs.aws.amazon.com/systems-manager/latest/userguide/hybrid-activation-managed-nodes.html)

When inspecting the original installer invocation, verify its registration Region. AWS's Linux installation procedure also requires downloading `ssm-setup-cli` from the activation's Region. Do not rerun registration merely to test these settings. [Hybrid Linux installation](https://docs.aws.amazon.com/systems-manager/latest/userguide/hybrid-multicloud-ssm-agent-install-linux.html)

## 3. Separate the service role from operator permissions

For a registered node, inspect `IamRole` from its node response; for failed onboarding, inspect the activation's role. Retrieve that role's trust policy, substituting its role name without a path:

```bash
ssm_role_name='HybridServersRole'
aws --profile "$ssm_profile" iam get-role \
  --role-name "$ssm_role_name" \
  --query 'Role.{Arn:Arn,Trust:AssumeRolePolicyDocument,Boundary:PermissionsBoundary}'
```

[`get-role`](https://docs.aws.amazon.com/cli/latest/reference/iam/get-role.html) exposes the trust policy and any permissions boundary. The hybrid service role must allow `ssm.amazonaws.com` to perform `sts:AssumeRole`. Check any source-account and source-ARN conditions against the activation account and Region. Review attached and inline permissions against `AmazonSSMManagedInstanceCore` or your equivalent custom policy. This is a service role; an EC2 instance-profile trust policy is not interchangeable. [Hybrid service-role requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/hybrid-multicloud-service-role.html)

The workstation identity separately needs `ssm:DescribeInstanceInformation`, `ssm:DescribeActivations`, and `iam:GetRole` for the lookups above; `sts:GetCallerIdentity` requires no permission grant. Creating an activation requires `ssm:CreateActivation` and `iam:PassRole` for the selected role, with tagging permissions when applicable. Granting those operator permissions does not repair the node's service role. [Systems Manager authorization reference](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ssm.html)

## 4. Inspect local registration and credential evidence

On the server:

```bash
sudo systemctl status amazon-ssm-agent --no-pager
sudo ssm-cli get-diagnostics --output table
sudo tail -n 100 /var/log/amazon/ssm/amazon-ssm-agent.log
```

For Snap, check `snap.amazon-ssm-agent.amazon-ssm-agent.service`. Locate `ssm-cli` in the installation directory if it is outside `PATH`; it ships with agent 3.1.501.0 and later. Focus on hybrid registration, AWS credentials, service status, and endpoint checks. An on-premises server does not need EC2 metadata access. [Service commands](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-status-and-restart.html), [diagnostic checks](https://docs.aws.amazon.com/systems-manager/latest/userguide/troubleshooting-managed-nodes-using-ssm-cli.html), [log locations](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html)

Correlate registration errors, recorded node ID/Region, credential-refresh failures, and connection errors with deployment timestamps. Registration state present locally does not prove AWS still recognizes it. A cloned disk can also carry another machine's registration; investigate the original host before altering either identity. [Registration-conflict troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/fleet-manager-troubleshooting-managed-nodes.html)

Inspect the agent's own credential context. On Linux it runs as root, and hybrid activation normally populates `/root/.aws/credentials`. Check for deleted files, changed ownership, or unexpected credential overrides without printing credential values. A successful CLI request from your login account tests a different context. Preserve registration state and private keys; do not copy credentials from another server. [Agent credential behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-technical-details.html)

## 5. Follow the actual network path

For standard commercial endpoints, check DNS and outbound TCP 443 to `ssm.REGION.amazonaws.com` and `ssmmessages.REGION.amazonaws.com`. Agent 3.3.40.0 and later prefers `ssmmessages`; older configurations can require `ec2messages` in Regions launched before 2024. Newer Regions do not support `ec2messages`. [Messaging behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-setting-up-messageAPIs.html)

Use diagnostics and timestamped logs to distinguish DNS, connection, TLS, and authorization failures. Verify the system clock and trusted CA chain. For a proxy, inspect the agent service's configuration rather than relying on shell connectivity; Session Manager does not support HTTPS proxy servers. [Proxy configuration](https://docs.aws.amazon.com/systems-manager/latest/userguide/configure-proxy-ssm-agent.html)

For PrivateLink, verify the on-premises route to endpoint interfaces, DNS forwarding, and endpoint security-group ingress on 443 from the connecting source. Also inspect endpoint policies: hybrid registration and token APIs cannot be evaluated using ordinary AWS principal identity in the same way as SigV4 requests. AWS documents dedicated `ssm:NodeAccountId` and `ssm:NodeOrgId` conditions. [Hybrid endpoint considerations](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html)

## 6. Recover the evidenced failure and verify the identity

Repair the identified role, credential, service, or network problem, then repeat the node lookup. Confirm the expected `mi-` ID becomes `Online` with a fresh `LastPingDateTime`.

If evidence establishes deliberate deregistration or unusable registration state, plan recovery through AWS's documented registration procedure with a fresh valid activation. Deregistration removes the managed node and prevents token refresh; it is not a connectivity test. Record the old identity, then verify the resulting ID, tags, and association targets after recovery. [Deregistration consequences](https://docs.aws.amazon.com/systems-manager/latest/userguide/fleet-manager-deregister-hybrid-nodes.html)

Keep an independent access path during recovery. A fresh heartbeat verifies managed-node availability; test Session Manager or Run Command separately when those capabilities are required.
