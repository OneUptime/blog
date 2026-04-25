# Validation Summary: How to Check If Port 9001 Is Accessible for Portainer Agent - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Agent
- Docker networking
- TCP port diagnostics (`nc`, `telnet`, `curl`, `nmap`, Python sockets)
- Linux firewall tooling (`ufw`, `firewall-cmd`, `iptables`)
- AWS EC2 security groups

## Sources Consulted
- Portainer Documentation, "Install Portainer Agent on Docker Standalone": https://docs.portainer.io/sts/admin/environments/add/docker/agent
- Portainer Documentation, "Install Portainer Agent on Docker Swarm": https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer Agent GitHub repository README (`/ping` endpoint, TLS behavior, default agent port): https://github.com/portainer/agent
- Docker Docs, "Networking": https://docs.docker.com/network
- Docker Docs, "docker container run": https://docs.docker.com/reference/cli/docker/container/run
- curl man page: https://curl.se/docs/manpage.html
- Nmap Reference Guide, "Port Scanning Basics": https://nmap.org/man/man-port-scanning-basics.html
- AWS CLI Command Reference, `authorize-security-group-ingress`: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- firewalld `firewall-cmd` man page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Local CLI help output: `nc -h`, `telnet --help`, `ss --help`, `ufw --help`, `iptables --help`, `wget --help`, `busybox wget --help`

## Issues Found
- The `curl` example used `telnet://` against port `9001`. Portainer documents standard Agent communication as HTTPS, and the agent exposes a public `/ping` endpoint that returns `204`. I replaced it with `curl -sk -o /dev/null -w '%{http_code}\n' https://AGENT_HOST_IP:9001/ping`.
- The Docker-container check used `http://AGENT_HOST_IP:9001/`, which was the wrong protocol for the standard Portainer Agent. I replaced it with an HTTPS `/ping` check from a temporary container sharing Portainer's network namespace so the test reflects the Portainer container's network path.
- The `nmap` state comment simplified `filtered` and `closed` too aggressively. I corrected the note to match Nmap's documented port state meanings.
- The Python socket example labeled every non-zero `connect_ex` result as `CLOSED/FILTERED`, but non-zero results also cover other reachability failures. I changed the output to `NOT REACHABLE`.
- The expected `ss` output was too specific to one socket formatting example. I generalized it to "a LISTEN entry on :9001".
- The `iptables-save > /etc/iptables/rules.v4` persistence example was presented as generic guidance even though that path is distro-specific. I added a Debian/Ubuntu qualification.

## Review Notes
- Portainer's current documentation describes standard Agent deployments as a legacy option and recommends the Edge Agent for most new use cases. The post remains technically relevant for environments that still use the standard Agent on port `9001`.
