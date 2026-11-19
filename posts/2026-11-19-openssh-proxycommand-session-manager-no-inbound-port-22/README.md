# How to Use OpenSSH `ProxyCommand` over Session Manager Without Opening Port 22

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Session Manager, OpenSSH, Security

Description: Configure SSH through Session Manager with explicit AWS identity, verified host keys, separate SSH authentication, and no inbound port 22 rule.

OpenSSH can use Session Manager as its transport while retaining SSH authentication and file transfers. Your workstation starts an AWS session; SSM Agent connects that stream to the instance's SSH server. The instance needs no externally reachable port 22, public IP, or bastion. It still needs a running `sshd` listening on the selected local port. [AWS SSH setup](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-enable-ssh-connections.html)

This example connects a Linux or macOS workstation to a Linux EC2 instance. Replace the instance ID, account, Region, profile, OS username, and key path consistently.

## Prepare both ends

Use a maintained SSM Agent release meeting the current prerequisite of **3.0.222.0 or later** for SSH sessions. Install AWS CLI v2 and the local Session Manager plugin; AWS currently directs users to plugin **1.2.764.0 or later**. The plugin is separate from the CLI. [Agent prerequisites](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-prerequisites.html), [plugin installation](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)

```bash
aws --version
session-manager-plugin --version
ssh -V
aws --profile prod-ssm --region us-east-1 sts get-caller-identity
```

Confirm the returned `Account` and `Arn` identify the intended account and role. Authenticate your configured profile before running SSH, including any required SSO login. A profile's name alone proves nothing about its credentials. [Caller identity](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html)

The node needs Systems Manager permissions, commonly supplied by an instance profile containing `AmazonSSMManagedInstanceCore`. These node credentials are separate from your workstation's permissions. [Instance permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-instance-profile.html)

Keep the agent's outbound HTTPS path to Systems Manager and its `ssmmessages` channel working, through internet egress or VPC endpoints. Closing external SSH access does not remove these dependencies. The host firewall must also permit the agent's local connection to `sshd`. [Session networking](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-privatelink.html)

## Authorize the caller and document

An administrator can adapt this caller policy for one instance. The AWS-owned document ARN has an empty account field. [SSH permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-enable-ssh-connections.html), [AWS document ARN example](https://docs.aws.amazon.com/codebuild/latest/userguide/sandbox.html)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ssm:StartSession",
      "Resource": [
        "arn:aws:ec2:us-east-1:111122223333:instance/i-0123456789abcdef0",
        "arn:aws:ssm:us-east-1::document/AWS-StartSSHSession"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["ssmmessages:OpenDataChannel", "ssm:TerminateSession"],
      "Resource": "arn:aws:ssm:us-east-1:111122223333:session/*",
      "Condition": {
        "StringEquals": {
          "ssm:resourceTag/aws:ssmmessages:session-id": "${aws:userid}"
        }
      }
    }
  ]
}
```

The session condition limits those operations to the caller's sessions and supports assumed roles. Add `ssm:ResumeSession` under that condition only if needed. Discovery permissions are separate. This grants the shown SSH connection; do not treat it as proof that other session types are prohibited. If SSH-only access is required, review `ssm:SessionDocumentAccessCheck` and verify that other documents and a request omitting `--document-name` are denied under the caller's effective permissions. This policy does not override broader grants or explicit denies already applicable to the caller. [Session ownership examples](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-examples.html), [document access condition](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ssm.html), [IAM evaluation](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)

AWS authorizes the tunnel. SSH independently authenticates the OS user: `ec2-user`, `ubuntu`, or your provisioned account needs the corresponding public key authorized on the node. Session Manager access does not install that key or make the AWS role an SSH account. [SSH key requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-enable-ssh-connections.html)

## Verify the server before connecting

Obtain the instance's SSH **public host key** through a trusted administrative channel or provisioning inventory. For example, an administrator already authenticated to the correct node can read its configured host key:

```bash
# On the node; use its configured host-key path if different.
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256
sudo cat /etc/ssh/ssh_host_ed25519_key.pub
```

Have the administrator identify the account, Region, instance, and fingerprint. Transfer only the public key. On your workstation, save it as `app-host.pub`, check its fingerprint against that trusted record, and proceed only if it matches. [Host verification](https://man.openbsd.org/ssh#VERIFYING_HOST_KEYS), [fingerprint options](https://man.openbsd.org/ssh-keygen)

```bash
ssh-keygen -lf ./app-host.pub -E sha256
```

If that command fails or the fingerprint does not match, stop. After verifying the fingerprint, import the same public-key file. The subshell stops on command failures, including a missing or unreadable key:

```bash
(
set -e
ssh-keygen -lf ./app-host.pub -E sha256 >/dev/null
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/known_hosts_ssm
chmod 600 ~/.ssh/known_hosts_ssm
awk -v host='111122223333.us-east-1.i-0123456789abcdef0' \
  '{print host, $1, $2}' ./app-host.pub >> ~/.ssh/known_hosts_ssm
)
```

This alias records the intended destination for host-key lookup; AWS credentials still determine which account receives the request. A changed key needs investigation and authenticated verification before replacement.

## Configure the proxy stream

Place this specific block before broad defaults in `~/.ssh/config`:

```sshconfig
Host app-prod-ssm
    HostName i-0123456789abcdef0
    User ec2-user
    Port 22
    IdentityFile ~/.ssh/prod.pem
    IdentitiesOnly yes
    HostKeyAlias 111122223333.us-east-1.i-0123456789abcdef0
    UserKnownHostsFile ~/.ssh/known_hosts_ssm
    StrictHostKeyChecking yes
    ProxyCommand aws --profile prod-ssm --region us-east-1 ssm start-session --target %h --document-name AWS-StartSSHSession --parameters portNumber=%p
```

`%h` becomes the configured instance ID and `%p` becomes `22`. That port is the node's SSH destination; no local listening port is created by this command. The explicit profile and Region prevent reliance on ambient defaults. OpenSSH substitutes tokens without shell escaping, so keep the hostname as a literal instance ID and quote any replacement argument containing spaces. [StartSession parameters](https://docs.aws.amazon.com/cli/latest/reference/ssm/start-session.html), [SSH tokens](https://man.openbsd.org/ssh_config#TOKENS)

OpenSSH exchanges protocol bytes through the proxy's stdin and stdout. Keep wrappers silent on stdout, send diagnostics to stderr, and never add `2>&1`, pipe the stream through a formatter, or redirect it to a file. Ensure `aws` and `session-manager-plugin` are on the noninteractive process's `PATH`. [ProxyCommand behavior](https://man.openbsd.org/ssh_config#ProxyCommand)

`StrictHostKeyChecking yes` requires the verified entry prepared above. `HostKeyAlias` selects its lookup name, while `IdentitiesOnly` limits offered authentication identities. [Client configuration](https://man.openbsd.org/ssh_config)

```bash
chmod 600 ~/.ssh/config
chmod 400 ~/.ssh/prod.pem
ssh -G app-prod-ssm
ssh app-prod-ssm
```

`ssh -G` prints the effective configuration without connecting. Check the hostname, username, identity file, host-key alias, and proxy command. [SSH options](https://man.openbsd.org/ssh)

File copies reuse the same alias and authentication:

```bash
scp ./report.txt app-prod-ssm:~/report.txt
```

Current OpenSSH `scp` uses SFTP by default, so the server must provide its SFTP subsystem and the destination must be writable by that OS user. [SCP manual](https://man.openbsd.org/scp)

## Diagnose the failing layer

Use `ssh -vvv app-prod-ssm` and preserve the first meaningful error. [SSH debugging](https://man.openbsd.org/ssh)

| Symptom | Check next |
| --- | --- |
| Credentials or `AccessDeniedException` | Profile authentication, caller identity, instance/document permission, channel permission, applicable denies |
| `TargetNotConnected` | Instance ID, account, Region, agent health and messaging connectivity |
| Plugin missing or command not found | Plugin installation and the proxy process's `PATH` |
| Connection refused after session creation | Node's `sshd`, selected port, listening address and local firewall |
| Host-key verification failure | Alias, trusted key entry and evidence of legitimate host-key rotation |
| `Permission denied (publickey)` | OS username, offered private key, authorized public key and server-side permissions |
| Invalid SSH banner or early protocol failure | Unexpected stdout from wrappers or shell startup configuration |

AWS documents account/Region mismatches and node readiness among session failure causes. A working standard Session Manager shell does not prove SSH service readiness or key authorization. [Session troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-troubleshooting.html)

Finally, CloudTrail records session API activity, but Session Manager cannot produce command/output transcripts for this encrypted SSH tunnel. Configure separate OS or application auditing when required; enabling S3 or CloudWatch session logging will not record SSH payloads. [API auditing](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-auditing.html), [logging limits](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging.html)
