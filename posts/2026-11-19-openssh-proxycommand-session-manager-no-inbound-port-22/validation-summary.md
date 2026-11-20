# Validation Summary: How to Use OpenSSH `ProxyCommand` over Session Manager Without Opening Port 22

## Status
validated

## Post Type
Tutorial / configuration guide with IAM JSON, SSH configuration, and shell commands.

## Technologies Covered
- AWS Systems Manager Session Manager and SSM Agent
- Amazon EC2, IAM, STS, and AWS CLI v2
- Session Manager plugin and AWS PrivateLink
- OpenSSH client/server, ProxyCommand, SSH host keys, and public-key authentication
- SCP and SFTP
- AWS CloudTrail and session logging
- Bash and awk

## Sources Consulted
- [AWS SSH setup](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-enable-ssh-connections.html)
- [Agent prerequisites](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-prerequisites.html)
- [plugin installation](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)
- [Caller identity](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html)
- [Instance permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-instance-profile.html)
- [Session networking](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-privatelink.html)
- [AWS document ARN example](https://docs.aws.amazon.com/codebuild/latest/userguide/sandbox.html)
- [Session ownership examples](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-examples.html)
- [document access condition](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ssm.html)
- [IAM evaluation](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)
- [Host verification](https://man.openbsd.org/ssh#VERIFYING_HOST_KEYS)
- [fingerprint options](https://man.openbsd.org/ssh-keygen)
- [StartSession parameters](https://docs.aws.amazon.com/cli/latest/reference/ssm/start-session.html)
- [SSH tokens](https://man.openbsd.org/ssh_config#TOKENS)
- [SCP manual](https://man.openbsd.org/scp)
- [Session troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-troubleshooting.html)
- [API auditing](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-auditing.html)
- [logging limits](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging.html)

## Issues Found
No technical issues found.

## Review Notes
- Reviewed on 2026-11-20. README.md was left unchanged because the documented workflow, commands, and configuration are technically sound.
- Verified the separation between AWS tunnel authorization, node IAM permissions, SSH host verification, and OS-user authentication. Removing inbound SSH access does not remove the need for a reachable local SSH daemon or outbound Systems Manager connectivity.
- Checked the instance and AWS-owned document ARNs, StartSession permission, session ownership condition, and optional ResumeSession permission against AWS documentation. The empty account field in the AWS-owned document ARN is supported by the CodeBuild example. AWS explicitly documents the ownership condition for both IAM users and role sessions. The post correctly avoids claiming that this policy alone guarantees SSH-only access under all effective permissions.
- Version caveat: AWS's SSH setup page still lists older agent/plugin thresholds (2.3.672.0 and 1.1.23.0). The dedicated prerequisite page specifies agent 3.0.222.0 for SSH/port forwarding, and the plugin installation page directs users to 1.2.764.0 or later. The post follows those dedicated pages and recommends maintained releases, so no correction was needed.
- Checked CLI argument names and parameter shorthand against AWS CLI documentation. Verified SSH configuration precedence, proxy stdin/stdout behavior, token substitution, identity selection, host-key aliases, fingerprint flags, strict checking, and debugging/configuration-display options against the OpenSSH manuals.
- Confirmed the SCP example uses the configured SSH alias and that current OpenSSH defaults to SFTP. The server must support SFTP and permit writes to the destination.
- Confirmed troubleshooting guidance for credentials, permissions, plugin availability, node readiness, account/Region mismatches, local SSH service failures, and SSH authentication. CloudTrail records session API activity, while Session Manager cannot log SSH payload transcripts.
- All referenced technical documentation URLs resolved to the expected official AWS or OpenBSD resources. The author profile is attribution, not a technical source.
- Local checks passed using OpenSSH 10.3p1: parsed the IAM JSON; syntax-checked all Bash blocks with bash -n; loaded the exact SSH configuration through ssh -G -F in a temporary file and checked its effective fields; generated a disposable Ed25519 key, ran the host-key import block in an isolated temporary home, and verified alias lookup with ssh-keygen -F. Removing the input public key caused the import block to fail as intended.
- Validation was based on official documentation and local checks. No live AWS session, EC2 SSH login, file transfer, or deployed IAM-policy test was performed. The example's placeholders must be replaced and the actual account's effective permissions and network configuration verified during deployment.
