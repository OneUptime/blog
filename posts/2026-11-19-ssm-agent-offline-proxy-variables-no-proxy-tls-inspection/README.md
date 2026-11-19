# SSM Agent Keeps Going Offline Behind a Proxy: Configure Proxy Variables, `no_proxy`, and TLS Inspection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Proxy, TLS, Troubleshooting

Description: Diagnose SSM Agent disconnects behind an HTTP proxy by correcting its service environment, protecting metadata access, and validating certificate trust and session channels.

A successful `curl` command in your login shell does not establish that SSM Agent can connect. The agent has its own service environment and AWS credentials, and Session Manager also needs a working streaming connection.

This walkthrough uses **RHEL 9, the RPM-installed agent, systemd, IPv4 IMDS, and an HTTP forward proxy**. Run node commands through an existing recovery connection. Replace the example proxy and Region with your values.

## Configure the service that actually runs

Inspect the loaded unit and existing overrides before editing:

```bash
sudo systemctl status amazon-ssm-agent.service --no-pager
sudo systemctl cat amazon-ssm-agent.service
sudo systemctl show amazon-ssm-agent.service \
  --property=Environment --property=EnvironmentFiles
```

Inspect any referenced environment files too; their assignments can override `Environment=` values. Keep this output local if existing configuration contains credentials. System services do not inherit arbitrary exports from your interactive shell. Environment variables are also unsuitable for secrets, so this example uses a proxy authorized by network policy without embedding a password. [systemd environment rules](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html)

Create or amend the drop-in with:

```bash
sudo systemctl edit amazon-ssm-agent.service
```

```ini
[Service]
Environment="http_proxy=http://proxy.corp.example:3128"
Environment="https_proxy=http://proxy.corp.example:3128"
Environment="no_proxy=169.254.169.254"
```

Resolve conflicting proxy assignments in existing overrides and environment files, including uppercase variants. The agent's WebSocket dialer uses Go's environment proxy resolver, which prefers nonempty `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY` over their lowercase equivalents. A stale uppercase value can therefore defeat this drop-in. [Agent WebSocket dialer](https://raw.githubusercontent.com/aws/amazon-ssm-agent/mainline/agent/session/communicator/websocketutil/websocketutil.go), [Go proxy precedence](https://go.dev/src/vendor/golang.org/x/net/http/httpproxy/proxy.go)

The `https_proxy` variable selects a proxy for HTTPS destinations; its `http://` value describes the connection to the proxy. AWS documents HTTP proxies for SSM Agent and explicitly excludes **HTTPS proxy servers from Session Manager support**. Changing this URL to `https://` is therefore not an appropriate Session Manager repair. [AWS proxy configuration](https://docs.aws.amazon.com/systems-manager/latest/userguide/configure-proxy-ssm-agent.html)

Ubuntu Snap installations use `snap.amazon-ssm-agent.amazon-ssm-agent.service` instead. Editing the RPM unit does not configure that installation. AWS provides the corresponding Snap instructions on the same page.

Apply the change:

```bash
sudo systemctl daemon-reload
sudo systemctl restart amazon-ssm-agent.service
sudo systemctl status amazon-ssm-agent.service --no-pager
```

Reloading unit definitions alone does not replace the running process's environment; restart the service. A restart stops and starts the agent, interrupting its connectivity, so perform it through the recovery connection. [systemctl commands](https://www.freedesktop.org/software/systemd/man/latest/systemctl.html)

## Keep metadata and credentials on the correct path

`no_proxy=169.254.169.254` keeps IPv4 EC2 metadata requests off the proxy. Without this exclusion, AWS warns that IMDSv2-enforced requests can fail; with IMDSv1 fallback, the agent can acquire the proxy host's identity instead. [IMDS bypass requirement](https://docs.aws.amazon.com/systems-manager/latest/userguide/configure-proxy-ssm-agent.html)

Test direct IMDSv2 access without retrieving credential contents:

```bash
(
  ssm_imds_token=$(curl --disable --noproxy '*' --fail --silent --show-error \
    --connect-timeout 2 --max-time 5 --request PUT \
    --header 'X-aws-ec2-metadata-token-ttl-seconds: 60' \
    http://169.254.169.254/latest/api/token) &&
  curl --disable --noproxy '*' --fail --silent --show-error \
    --connect-timeout 2 --max-time 5 \
    --header "X-aws-ec2-metadata-token: $ssm_imds_token" \
    http://169.254.169.254/latest/meta-data/instance-id
)
```

Expect this instance's ID. The explicit bypass tests direct metadata reachability, not the agent's effective environment. Keep IMDSv2 enforced when repairing routing. IPv6 metadata uses `fd00:ec2::254`, requires an enabled endpoint on a Nitro instance in an IPv6-supported subnet, and needs a separately verified agent bypass. IPv6 in a URL uses brackets; do not assume URL syntax proves `no_proxy` matching in your installed agent. This IPv4 example does not configure an IPv6-only deployment. [EC2 metadata behavior](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)

Also inspect the intended credential source. On Linux the agent runs as root; service-level AWS credential variables and `/root/.aws/credentials` can take precedence over the EC2 instance profile. A successful CLI call under your personal account tests a different identity. Investigate stale credentials before expanding IAM permissions. [Agent credential precedence](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-technical-details.html)

## Test the proxy path and streaming support

For standard commercial endpoints, permit the proxy's onward HTTPS access to `ssm.REGION.amazonaws.com` and `ssmmessages.REGION.amazonaws.com`. Legacy agents may also require `ec2messages` in Regions launched before 2024; newer Regions do not support it. Agent 3.3.40.0 and later prefers `ssmmessages` when available. [Message endpoint behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-setting-up-messageAPIs.html)

Probe through the explicit proxy, overriding shell bypass rules:

```bash
curl --disable --proxy http://proxy.corp.example:3128 --noproxy '' \
  --connect-timeout 5 --max-time 15 --verbose \
  https://ssm.us-east-1.amazonaws.com/
```

Repeat for `ssmmessages.us-east-1.amazonaws.com`. Inspect the CONNECT response, TLS verification, final response, and curl exit status. An AWS error from an unsigned request can demonstrate transport progress; a proxy-generated error does not establish AWS connectivity. This probe does not validate node IAM or a session channel. [curl proxy options](https://curl.se/docs/manpage.html)

Session Manager uses WebSockets. The operational implication is that a proxy must permit CONNECT tunnels to the required destinations and preserve sustained WebSocket traffic; an inspecting proxy must support the upgrade and subsequent stream. For recurring disconnects, correlate agent timestamps with proxy resets, connection limits, and idle-timeout events. A short HTTPS request cannot test those conditions. [Session connection API](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_StartSession.html)

## Repair certificate trust when inspection is intentional

If TLS fails, distinguish an untrusted issuer from an expired certificate, hostname mismatch, or incorrect system clock. With approved TLS inspection, the node sees a certificate issued by your organization's inspection CA. Confirm that issuer and obtain its trusted CA certificate through your organization's distribution process.

The Linux agent loads Go's system certificate pool. Inspect its service environment for `SSL_CERT_FILE` and `SSL_CERT_DIR`, which override default CA locations; resolve stale overrides before relying on host trust updates. Go can cache this pool, which is another reason to restart after changing trust. [Linux agent certificate loading](https://raw.githubusercontent.com/aws/amazon-ssm-agent/mainline/agent/network/tlsconfig_unix.go), [Go certificate-pool behavior](https://pkg.go.dev/crypto/x509#SystemCertPool)

For this RHEL installation using the default CA locations, with `ca-certificates` installed, add the approved PEM CA certificate and regenerate system trust:

```bash
sudo install -m 0644 /secure-staging/corporate-inspection-ca.crt \
  /etc/pki/ca-trust/source/anchors/corporate-inspection-ca.crt
sudo update-ca-trust extract
sudo systemctl restart amazon-ssm-agent.service
```

This changes host trust, so deploy the intended CA rather than trusting a captured leaf certificate. Repeat the probe and inspect fresh agent logs. These are RHEL trust-store commands; other distributions and packaging need their own verified trust procedure. [Agent TLS implementation](https://raw.githubusercontent.com/aws/amazon-ssm-agent/mainline/agent/network/tlsconfig.go), [RHEL certificate installation](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/using-shared-system-certificates_securing-networks)

A curl-only CA override does not configure the agent. Keep certificate verification enabled; repair the trust chain or use an approved non-inspecting path that preserves TLS verification. Without inspection, check that the operating system trusts the required Amazon certificate authorities. [AWS certificate troubleshooting](https://docs.aws.amazon.com/systems-manager/latest/userguide/fleet-manager-troubleshooting-managed-nodes.html)

## Verify recovery beyond a restart

Read fresh evidence:

```bash
sudo journalctl -u amazon-ssm-agent.service --since '10 minutes ago' --no-pager
sudo tail -n 100 /var/log/amazon/ssm/amazon-ssm-agent.log
```

Check whether credential, TLS, or channel errors stopped. AWS documents the [agent log locations](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent-logs.html).

From an authorized workstation with the Session Manager plugin installed, confirm a fresh Fleet Manager heartbeat and open a session:

```bash
aws --profile production --region us-east-1 ssm start-session \
  --target i-0123456789abcdef0
```

Verify the shell remains usable through the interval that previously caused disconnection. The workstation has its own proxy path, so investigate its plugin errors separately from node errors. A working session validates more than the node's heartbeat. [Starting sessions](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_StartSession.html)
