# Validation Summary: How to Debug Agent Connectivity with Telnet and Curl - Portainer

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer Agent
- Docker
- Bash
- curl
- OpenSSL
- netcat (`nc`)
- telnet
- tcpdump
- traceroute

## Sources Consulted
- Portainer Documentation, "Install Portainer Agent on Docker Standalone": https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Documentation, "How does Portainer secure connectivity to and from Agents and Edge Agents?": https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents
- Portainer Documentation, "Requirements and prerequisites": https://docs.portainer.io/start/requirements-and-prerequisites
- Official Portainer Agent repository README: https://github.com/portainer/agent
- GNU Bash Reference Manual, "Redirections": https://www.gnu.org/software/bash/manual/html_node/Redirections.html
- everything curl, "Timeouts": https://ec.haxx.se/usingcurl/timeouts.html
- Wireshark / libpcap `pcap-filter` manual: https://www.wireshark.org/docs/man-pages/pcap-filter.html
- Traceroute for Linux upstream source package (reviewed `traceroute.8`): https://downloads.sourceforge.net/project/traceroute/traceroute/traceroute-2.1.6/traceroute-2.1.6.tar.gz
- Local command help output: `curl --help all`
- Local command help output: `wget --help`
- Local command help output: `openssl s_client -help`
- Local command help output: `openssl x509 -help`
- Local command help output: `nc -h`
- Local command help output: `timeout --help`
- Local command help output: `tcpdump --help`

## Issues Found
- The post tested the Portainer Agent over plain HTTP on port `9001`, but standard (non-Edge) Portainer agents use HTTPS with self-signed certificates by default. I updated the `curl` and `wget` examples to use `https://`, added `-k` / `--no-check-certificate` where appropriate, and corrected the expected `/ping` response to `204 No Content`.
- The TLS section implied TLS was optional for standard agents. I corrected the wording to reflect that TLS is the default for non-Edge agents and replaced the certificate-inspection pipeline with one that extracts the certificate before passing it to `openssl x509`.
- The agent API examples used incorrect paths and an incorrect authentication model. `/v1/browse/containers` and `/v1/docker/containers/json` are not the documented public examples here, and `AGENT_SECRET` is not sent as a request header. I replaced that section with accurate guidance: `/ping` is the documented public endpoint, and other agent/proxied Docker API requests require Portainer-signed `X-PortainerAgent-PublicKey` and `X-PortainerAgent-Signature` headers.
- The "inside the Portainer container" and quick-script examples also used plain HTTP. I updated them to test the HTTPS `/ping` endpoint and added a caveat that container shell/network tools depend on the Portainer image in use.

## Review Notes
- This post now accurately matches the behavior of the standard Portainer Agent, not the Edge Agent. Edge Agent networking differs and should be documented separately if needed.
- Using `-k` / `--insecure` is appropriate for ad-hoc troubleshooting because the standard agent uses self-signed certificates by default, but it should not be treated as a general production trust model.
