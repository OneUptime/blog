# Portainer Agent Connection Timeouts: Debugging Port 9001, TLS, DNS, and Clock Skew

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Agent, Docker, TLS, Networking, Troubleshooting

Description: Trace standard Portainer Agent timeouts from the Server’s network context through DNS, TCP 9001, firewalls, Agent health, HTTPS certificates, secrets, clocks, and Swarm overlay behavior.

---

For a standard Portainer Agent connection, Portainer Server initiates an HTTPS connection to the Agent address, normally on port `9001`. A timeout means that request did not complete in time; it does not by itself prove that the Agent is down.

Debug the path from the component that makes the connection:

```text
Portainer Server network namespace
        -> DNS
        -> route / NAT / firewall
        -> TCP 9001
        -> Agent TLS listener
        -> Agent authentication and Docker access
```

The Edge Agent uses a different connection model. Confirm the environment type before opening inbound 9001 or changing a standard Agent address.

## Read Both Ends of the Failure

Capture the Server and Agent logs for the same time window:

```bash
docker logs --since=15m portainer
docker logs --since=15m portainer_agent
```

On Swarm:

```bash
docker service ls
docker service logs --since=15m PORTAINER_SERVER_SERVICE
docker service logs --since=15m PORTAINER_AGENT_SERVICE
```

Substitute the actual names shown by `docker service ls`; services deployed with `docker stack deploy` are prefixed with the stack name.
Run these commands on a Swarm manager. `docker service logs` only reads services that use the `json-file` or `journald` logging driver; use the configured logging backend for other drivers.

Classify the message:

| Symptom | Focus first |
| --- | --- |
| DNS lookup failure | Address, resolver, search domain, and network attachment. |
| `i/o timeout` or context deadline | Route, firewall, dropped packets, MTU, or overloaded Agent. |
| Connection refused | Wrong address/port or no listener. |
| TLS handshake or protocol error | Wrong scheme, interception, incompatible TLS, or a non-Agent listener. |
| Unauthorized or secret mismatch | `AGENT_SECRET` and Server/Agent configuration. |
| Agent reaches no manager | Swarm Agent discovery, overlay network, and manager availability. |

Preserve the exact host and port from the log. Troubleshooting a DNS alias while Portainer is configured with an old IP will not help.

## Verify the Environment Address Format

Portainer's standard Docker Agent instructions say to enter a DNS name or IP plus port, without a protocol:

```text
agent-01.internal.example:9001
```

Server-to-Agent communication is still HTTPS; Portainer handles that protocol. Avoid values such as `https://agent-01:9001` when the UI field expects `host:port`.

Check the stored environment address in the UI and compare it with current infrastructure. If an address changed, update it through supported environment management rather than creating a duplicate environment casually.

## Test DNS from the Server’s Network Context

Resolution on an administrator laptop does not prove resolution inside Portainer. Container DNS depends on its Docker networks and daemon configuration.

If the Portainer image contains a resolver utility, use it:

```bash
docker exec portainer getent hosts agent-01.internal.example
```

Otherwise run an approved temporary diagnostics image attached to the same Docker network as Portainer. Do not assume the host's `/etc/hosts` is automatically copied into an existing container.

Validate:

- the name returns the intended address family and IP;
- internal split-horizon DNS is available to the Server container;
- stale records and cached addresses have expired;
- a Compose service name is reachable only on a network both containers share;
- the name resolves to the intended Agent rather than another HTTPS service.

If an IP works but the name does not, fix DNS. If the name resolves but both addresses time out, continue down the path.

## Prove TCP 9001 Reachability

Portainer documents that port `9001` on a standard Docker Agent must be accessible from Portainer Server. Test from the Server's network namespace or a diagnostics container attached to the same Docker network:

```bash
nc -vz agent-01.internal.example 9001
```

Then test HTTPS without hiding certificate detail:

```bash
curl -vk https://agent-01.internal.example:9001/
```

The endpoint path may return a non-UI response; the useful evidence is whether TCP connects and a TLS handshake occurs.

If the port times out, inspect:

- host firewall on the Agent node;
- cloud security groups or network ACLs;
- NAT and port-forwarding rules;
- routing between Server and Agent subnets;
- Docker published-port binding and address;
- corporate proxy or `NO_PROXY` configuration;
- packet capture or flow logs on both sides.

Allow only the Portainer Server sources that need access. Do not expose 9001 to the public Internet as a diagnostic step.

## Confirm the Agent Is Listening and Healthy

On the Agent host:

```bash
docker ps -a --filter name=portainer_agent
docker port portainer_agent
docker logs --tail=300 portainer_agent
docker inspect portainer_agent --format '{{json .HostConfig.PortBindings}}'
```

The recommended Standalone deployment publishes `9001:9001`. Also verify the mounts needed by the Agent, including the Docker socket and the Docker volume path used by your platform.

A container can be `Running` while its process is unhealthy or blocked. Check CPU, memory, disk, file descriptors, Docker daemon responsiveness, and restarts. If the Agent cannot query Docker, the TCP connection may work but environment operations still fail.

## Understand TLS and Clock Skew Correctly

Portainer documents that the standard Agent generates a self-signed certificate and serves its API over HTTPS. However, the Agent's official security documentation also states that Portainer and Agent proxy clients skip TLS server-certificate verification. Protected Agent requests are authorized with signed request headers. In default mode, the Agent associates the first valid Portainer public key; with `AGENT_SECRET`, the shared secret is incorporated into signature verification and multiple Portainer instances can connect.

That means the Agent certificate does not need a public CA or a SAN matching the configured DNS name. A manual `curl` without `-k` will normally reject the self-signed certificate even when Portainer can connect successfully. Do not replace the Agent certificate merely to make that diagnostic command trust it.

A successful TCP connection followed by a real TLS handshake failure still narrows the problem. Check that the configured port actually reaches a standard Agent HTTPS listener, that no proxy is speaking plain HTTP or intercepting the connection, and that Server and Agent versions are compatible.

Keep the Server and Agent host clocks synchronized for logs and for surrounding systems such as registries, proxies, and identity providers. Run the host's supported time tools on each machine, for example:

```bash
date -u
timedatectl status
```

Containers inherit the host kernel clock, and minimal Portainer images may not contain `date` or `timedatectl`. Correct the host time service rather than trying to set time independently inside a container.

Clock skew is not a normal cause of standard Agent server-certificate rejection because that verification is skipped. It can matter when a separate TLS-verifying proxy, Docker API endpoint, registry, or Edge connection is involved; identify that component explicitly before changing certificates or verification settings.

## Match `AGENT_SECRET` and Versions

If Portainer Server is started with a custom `AGENT_SECRET`, the same exact value must be supplied to each standard or Edge Agent. Current Portainer documentation calls this out for upgrades.

Compare the presence—not the secret value in shared output—of the variable:

```bash
docker inspect portainer --format '{{range .Config.Env}}{{println .}}{{end}}'
docker inspect portainer_agent --format '{{range .Config.Env}}{{println .}}{{end}}'
```

Treat command output as sensitive. Repair the declarative deployment and recreate the affected container or service; do not post the secret in logs or tickets.

Portainer's current upgrade documentation also says Agent and Server versions should match. A Server-only upgrade can leave connectivity or feature incompatibilities. Record exact image digests and update through the documented platform procedure.

## Check Swarm-Specific Paths

In a Swarm Agent deployment, Server must reach Agent nodes on 9001, and Agents also coordinate across the overlay to reach a manager. From a Swarm manager, verify:

```bash
docker service ls
docker service ps PORTAINER_AGENT_SERVICE
docker service inspect PORTAINER_AGENT_SERVICE \
  --format '{{json .Spec.TaskTemplate.Networks}}'
docker network inspect PORTAINER_AGENT_OVERLAY
```

Resolve the service and overlay names from the deployment rather than assuming an unprefixed name.

Portainer documents overlay MTU mismatch as a cause of Agent communication failures on networks whose underlay MTU is smaller than Docker's overlay setting. Suspect MTU when small connections work but larger or overlay traffic stalls, and when other Swarm services show similar symptoms. Change network MTU only through a planned Docker/Swarm procedure because recreating ingress or overlay networks is disruptive.

## Verify the Repair End to End

- DNS resolves correctly from Portainer Server.
- TCP 9001 connects from the Server path.
- TLS reaches the Agent HTTPS listener without a protocol or interception error.
- Agent logs show stable startup and Docker access.
- `AGENT_SECRET` and image versions match.
- the environment becomes healthy and lists expected resources.
- firewall, DNS, and deployment changes are stored in configuration management.

Each test should eliminate one layer. That is faster and safer than repeatedly reinstalling the Agent while a firewall drops the same packets.

## Official Documentation

- [Portainer: Install Portainer Agent on Docker Standalone](https://docs.portainer.io/admin/environments/add/docker/agent)
- [Portainer: Install Portainer Agent on Docker Swarm](https://docs.portainer.io/admin/environments/add/swarm/agent)
- [Portainer: Why Have My Agents Stopped Working After Upgrading?](https://docs.portainer.io/faqs/upgrading/why-have-my-agents-stopped-working-after-upgrading-portainer)
- [Portainer: Agents and Environment Management FAQ](https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management)
- [Portainer Agent: Security and TLS behavior](https://github.com/portainer/agent#encryption)
- [Portainer: Updating on Docker Standalone](https://docs.portainer.io/start/upgrade/docker)
- [Docker: Published Ports](https://docs.docker.com/engine/network/port-publishing/)
