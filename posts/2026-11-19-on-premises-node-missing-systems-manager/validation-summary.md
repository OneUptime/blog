# Validation Summary: On-Premises Node Missing from SSM: Hybrid Activation and Agent Checks

## Status

validated

## Post Type

Technical troubleshooting guide with AWS CLI and Linux diagnostic commands.

## Technologies Covered

- AWS Systems Manager hybrid activations, managed nodes, and Fleet Manager
- AWS CLI, AWS STS, and JMESPath response queries
- AWS IAM service roles, trust policies, and operator permissions
- SSM Agent and ssm-cli on Linux, systemd, and Snap
- AWS PrivateLink, VPC endpoints, DNS, TLS, and HTTP proxies
- Session Manager and Run Command

## Sources Consulted

- [Managed-node behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/fleet-manager-managed-nodes.html)
- [Caller identity](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html)
- [lookup fields and filters](https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-instance-information.html)
- [DescribeActivations reference](https://docs.aws.amazon.com/cli/latest/reference/ssm/describe-activations.html)
- [Activation lifecycle](https://docs.aws.amazon.com/systems-manager/latest/userguide/hybrid-activation-managed-nodes.html)
- [Hybrid Linux installation](https://docs.aws.amazon.com/systems-manager/latest/userguide/hybrid-multicloud-ssm-agent-install-linux.html)
- [`get-role`](https://docs.aws.amazon.com/cli/latest/reference/iam/get-role.html)
- [Hybrid service-role requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/hybrid-multicloud-service-role.html)
- [Systems Manager authorization reference](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ssm.html)
- [Service commands](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-status-and-restart.html)
- [diagnostic checks](https://docs.aws.amazon.com/systems-manager/latest/userguide/troubleshooting-managed-nodes-using-ssm-cli.html)
- [log locations](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html)
- [Registration-conflict troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/fleet-manager-troubleshooting-managed-nodes.html)
- [Agent credential behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-technical-details.html)
- [Messaging behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-setting-up-messageAPIs.html)
- [Proxy configuration](https://docs.aws.amazon.com/systems-manager/latest/userguide/configure-proxy-ssm-agent.html)
- [Hybrid endpoint considerations](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html)
- [Deregistration consequences](https://docs.aws.amazon.com/systems-manager/latest/userguide/fleet-manager-deregister-hybrid-nodes.html)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed all six sections against the linked AWS documentation. The README required no changes.
- Verified the CLI operation names, global options, filter syntax, output fields, and JMESPath projections. All four Bash code blocks passed `bash -n` syntax checks. The examples use the current `--filters` option rather than the deprecated instance-information filter list.
- Confirmed account and Region scoping, hybrid node identifiers, pagination guidance, and the Fleet Manager visibility caveat for nodes disconnected for at least 30 days.
- Confirmed activation defaults, expiration and capacity checks, the `RegistrationsCount` field spelling, and the distinction between activation expiration and existing-node connectivity.
- Confirmed the hybrid service trust principal, core managed policy, source conditions, role-name syntax, and separation of service-role permissions from caller permissions, including PassRole and tagging authorization.
- Confirmed Linux service names, log and credential locations, root credential context, and the availability of ssm-cli starting with agent version 3.1.501.0. Local commands assume an installed agent and the stated Linux/systemd environment.
- Confirmed the version 3.3.40.0 messaging preference, the pre-2024 Region restriction for ec2messages, HTTPS proxy limitations for Session Manager, and hybrid-specific VPC endpoint policy condition keys.
- Confirmed deregistration prevents authorization-token refresh. AWS pages differ on whether an existing activation can be reused for reregistration; the post's recommendation to use a fresh valid activation is compatible with the documented recovery procedures and does not depend on reuse.
- Opened every linked AWS documentation page and confirmed that each addresses the referenced topic. The author profile link is attribution rather than a technical source.
- Validation was based on documentation and local shell syntax checks. Commands were not executed against an AWS account or a live hybrid node; account-specific permissions, connectivity, and recovery behavior were not integration-tested.
