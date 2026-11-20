# Validation Summary: Fix SSM Agent Proxy Disconnects: `no_proxy` and TLS Inspection

## Status

validated

## Post Type

Technical troubleshooting guide with shell commands and systemd configuration.

## Technologies Covered

- AWS Systems Manager, SSM Agent, Fleet Manager, and Session Manager
- Amazon EC2 instance metadata (IMDSv2), instance profiles, and AWS credentials
- RHEL 9, RPM installations, systemd, and Ubuntu Snap service naming
- HTTP forward proxies, CONNECT tunnels, WebSockets, and proxy environment variables
- TLS inspection, CA trust stores, and Go certificate loading
- Bash, curl, GNU coreutils, and AWS CLI

## Sources Consulted

- [AWS: Configuring SSM Agent to use a proxy on Linux nodes](https://docs.aws.amazon.com/systems-manager/latest/userguide/configure-proxy-ssm-agent.html)
- [systemd execution environment](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html)
- [systemctl command reference](https://www.freedesktop.org/software/systemd/man/latest/systemctl.html)
- [SSM Agent WebSocket dialer source](https://raw.githubusercontent.com/aws/amazon-ssm-agent/mainline/agent/session/communicator/websocketutil/websocketutil.go)
- [Go proxy environment resolver source](https://go.dev/src/vendor/golang.org/x/net/http/httpproxy/proxy.go)
- [EC2: Using the Instance Metadata Service](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)
- [AWS: SSM Agent technical details and credential precedence](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-technical-details.html)
- [AWS: Message APIs and endpoint precedence](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-setting-up-messageAPIs.html)
- [curl command reference](https://curl.se/docs/manpage.html)
- [AWS StartSession API](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_StartSession.html)
- [AWS CLI start-session command reference](https://docs.aws.amazon.com/cli/latest/reference/ssm/start-session.html)
- [SSM Agent Linux certificate loading source](https://raw.githubusercontent.com/aws/amazon-ssm-agent/mainline/agent/network/tlsconfig_unix.go)
- [SSM Agent TLS configuration source](https://raw.githubusercontent.com/aws/amazon-ssm-agent/mainline/agent/network/tlsconfig.go)
- [Go crypto/x509 SystemCertPool documentation](https://pkg.go.dev/crypto/x509#SystemCertPool)
- [RHEL 9: Using shared system certificates](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/using-shared-system-certificates_securing-networks)
- [AWS: Troubleshooting managed node availability](https://docs.aws.amazon.com/systems-manager/latest/userguide/fleet-manager-troubleshooting-managed-nodes.html)
- [AWS: Viewing SSM Agent logs](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html)
- [journalctl command reference](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html)

- [GNU coreutils: install command](https://www.gnu.org/software/coreutils/manual/html_node/install-invocation.html)
- [GNU coreutils: tail command](https://www.gnu.org/software/coreutils/manual/html_node/tail-invocation.html)

## Issues Found

No technical issues found.

The README.md was left unchanged.

## Review Notes

- Confirmed the systemd drop-in syntax, RPM and Snap unit names, environment-file precedence, and the need to restart the agent to apply its environment. Go's proxy resolver selects nonempty uppercase variables before lowercase equivalents, supporting the warning about conflicting assignments.
- Confirmed AWS supports the documented HTTP proxy setup and excludes HTTPS proxy servers from Session Manager support. The HTTPS destination and HTTP proxy URL distinction is accurate.
- Confirmed the IMDSv2 token request, token header, 60-second lifetime, metadata address, and IPv6 prerequisites. The probe requests an instance ID rather than credential contents. Its explicit proxy bypass tests direct access independently of the service environment.
- Confirmed root credential precedence and the distinction between an interactive user's CLI identity and the agent's identity.
- Confirmed the 3.3.40.0 endpoint preference and the restriction of ec2messages to Regions launched before 2024. Modern agents can still use ec2messages in those Regions under documented permission/failover conditions; the post does not claim legacy agents are its only users.
- Checked curl option semantics, including placing --disable first, bypassing all proxies with --noproxy '*', and overriding bypass variables with --noproxy ''. An unsigned HTTP error can establish transport progress without proving IAM authorization or a usable session. Without --fail, curl can return success for HTTP error responses, so the instruction to inspect the response as well as the exit status matters.
- Confirmed the agent's WebSocket dialer and system certificate pool usage, Go CA environment overrides, and the RHEL trust-anchor directory and update-ca-trust extract command. The guidance preserves certificate verification and appropriately scopes the trust procedure to the stated installation.
- Confirmed log paths, journal filtering, and AWS CLI session syntax and plugin requirements. A sustained session is a stronger recovery check than an agent heartbeat or short HTTPS probe.
- All eight Bash command blocks passed bash -n syntax validation. Configuration and command semantics were reviewed against documentation and source; no live EC2, RHEL service, corporate proxy, IAM identity, or Session Manager connection was available for integration testing.
- The article's technical reference links resolved to the intended official documentation or source files. References to latest documentation and mainline source are moving targets; behavior should still be checked against the installed agent when diagnosing a specific deployment.
