# Fix Woodpecker Agent gRPC Connection Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, CI/CD, gRPC, Agent, TLS

Description: Restore a Woodpecker agent connection by validating its gRPC endpoint, registration token, HTTP/2 proxy, and TLS mode.

---

The Woodpecker agent does not connect to the server's normal web port. It opens a gRPC connection to the server's gRPC listener, authenticates with `WOODPECKER_AGENT_SECRET`, and optionally uses TLS. A correct UI at port 8000 therefore proves very little about agent connectivity to port 9000 or a TLS-terminating gRPC proxy.

Troubleshoot in layers: address and route, TCP reachability, TLS mode and certificate, agent registration token, then Woodpecker identity and version. Change one layer at a time and correlate agent, server, and proxy logs by timestamp.

This guide targets the current stable Woodpecker 3.17 configuration names. The project's `next` migration notes announce a TLS verification variable rename that corrects a misleading stable name; that distinction is called out below so stable and development examples are not mixed.

## Know the Two Server Ports

The normal defaults are:

- HTTP/web/API server: port `8000`;
- gRPC listener: port `9000`.

The server setting `WOODPECKER_GRPC_ADDR` defaults to `:9000`. The agent setting `WOODPECKER_SERVER` defaults to `localhost:9000`, which is correct only when the server really shares the agent's network namespace.

In Docker Compose:

~~~yaml
services:
  woodpecker-server:
    image: woodpeckerci/woodpecker-server:v3.17.0
    environment:
      - WOODPECKER_AGENT_SECRET_FILE=/run/secrets/woodpecker-agent-secret
    secrets:
      - woodpecker-agent-secret

  woodpecker-agent:
    image: woodpeckerci/woodpecker-agent:v3.17.0
    command: agent
    environment:
      - WOODPECKER_SERVER=woodpecker-server:9000
      - WOODPECKER_AGENT_SECRET_FILE=/run/secrets/woodpecker-agent-secret
    secrets:
      - woodpecker-agent-secret

secrets:
  woodpecker-agent-secret:
    file: ./woodpecker-agent-secret
~~~

`localhost` inside the agent container means the agent container, not the server container. Use the Compose service DNS name.

## Format WOODPECKER_SERVER as a gRPC Address

The normal value is `host:port`, not an HTTP URL:

~~~ini
WOODPECKER_SERVER=woodpecker-server:9000
~~~

For a remote TLS proxy:

~~~ini
WOODPECKER_SERVER=woodpecker-grpc.example.com:443
~~~

Do not copy the browser URL with `https://` into an address field unless the current documentation for a special transport says to. Woodpecker also supports a Unix socket with a `unix://` prefix, such as `unix:///run/woodpecker-grpc.sock`.

Confirm what the server actually binds:

~~~ini
WOODPECKER_GRPC_ADDR=:9000
~~~

Binding it to `localhost:9000` prevents remote agents from reaching it. Publishing only `8000:8000` exposes the UI but not direct gRPC.

## Test DNS and TCP from the Agent

Run these from the agent's network namespace, typically with a Linux diagnostic container attached to the same Compose or Kubernetes network. The stock Woodpecker agent image has no shell or these diagnostic utilities:

~~~bash
getent hosts woodpecker-server
nc -vz woodpecker-server 9000
~~~

For a remote endpoint:

~~~bash
getent hosts woodpecker-grpc.example.com
nc -vz woodpecker-grpc.example.com 443
~~~

Interpretation:

- DNS failure: service name, search domain, or split DNS is wrong.
- Connection refused: nothing listens at that address or port.
- Timeout: firewall, security group, NetworkPolicy, or route.
- TCP succeeds but gRPC fails: inspect TLS, HTTP/2 proxying, and authentication.

Test from the agent network. A successful workstation connection can take a different DNS and firewall path.

## Choose One TLS Topology

### Plain gRPC on a Private Network

The default server listener is commonly reached directly over the private Compose or cluster network:

~~~ini
WOODPECKER_SERVER=woodpecker-server:9000
WOODPECKER_GRPC_SECURE=false
~~~

Do not expose plaintext gRPC across an untrusted network.

### TLS Termination at a Reverse Proxy

Remote agents commonly connect to a public gRPC hostname on port 443:

~~~ini
WOODPECKER_SERVER=woodpecker-grpc.example.com:443
WOODPECKER_GRPC_SECURE=true
WOODPECKER_GRPC_VERIFY=false
~~~

The last setting is the stable 3.17 name, but its behavior is inverted relative to that name. The tagged implementation passes the value directly to Go's `tls.Config.InsecureSkipVerify`: `false` verifies the server certificate, while `true` skips verification. The 3.17 default is `true`, so set it explicitly to `false` for verified TLS. The proxy terminates TLS and forwards gRPC over cleartext HTTP/2 (h2c) to `woodpecker-server:9000`.

The server's documented Caddy example uses:

~~~caddy
reverse_proxy h2c://woodpecker-server:9000
~~~

Its Traefik example sets the upstream service port to 9000 and the scheme to `h2c`. A generic HTTP/1.1 proxy route to port 8000 will not carry the agent's gRPC stream correctly.

## Verify the Certificate and HTTP/2

From the agent network, using the same CA trust store as the agent:

~~~bash
openssl s_client \
  -connect woodpecker-grpc.example.com:443 \
  -servername woodpecker-grpc.example.com \
  -verify_hostname woodpecker-grpc.example.com \
  -verify_return_error \
  -alpn h2 </dev/null
~~~

Check:

- certificate DNS SAN matches the configured hostname;
- chain terminates at a CA trusted in the agent image/host;
- certificate is within its validity period;
- ALPN negotiates `h2`;
- the SNI hostname reaches the intended virtual host.

If an internal CA is used, mount or install that CA into the agent's system trust store. Disabling verification is a diagnostic at most; it permits impersonation of the server and exposure of agent authentication.

## Stable 3.17 Versus the next TLS Variable

Stable 3.17 uses:

~~~ini
WOODPECKER_GRPC_VERIFY=false
~~~

Despite the name and the wording in the 3.17 reference page, the tagged implementation treats `true` as "skip verification." Use `false` to verify the chain and hostname.

The current `next` migration notes announce:

~~~ini
WOODPECKER_GRPC_SKIP_VERIFY=false
~~~

The rename makes the name match the existing behavior; it does not invert the boolean. `false` verifies under both forms, while `true` disables verification. Verify your exact agent version before changing the key. On 3.17, setting only the unknown `WOODPECKER_GRPC_SKIP_VERIFY` key leaves the insecure `WOODPECKER_GRPC_VERIFY=true` default in place.

Version-pin server and agent images, and use the documentation page for that version during upgrades.

## Validate WOODPECKER_AGENT_SECRET

The agent authenticates with `WOODPECKER_AGENT_SECRET` or `WOODPECKER_AGENT_SECRET_FILE`. There are two registration models.

### System Token

The server and one or more agents share the configured system token:

~~~bash
openssl rand -hex 32
~~~

The agent uses it on first contact. The server registers the agent, returns an ID, and the agent stores that identity in `WOODPECKER_AGENT_CONFIG_FILE`, normally `/etc/woodpecker/agent.conf`.

The secret value must come from the same secret-manager record on server and agent. Watch for:

- two independently generated random values;
- a stale Compose `.env`;
- quoting accidentally included by a templating system;
- assuming the direct environment variable overrides `*_FILE`; in 3.17 a readable secret file wins, while an unreadable path falls back to the direct value;
- a secret mounted at the wrong path;
- different Kubernetes namespaces or Secret keys.

Do not print the token into logs. Compare secret-manager versions or hashes interactively in a secure administrative session and rotate it if exposed.

### Per-Agent Token

An administrator can create an agent in **Settings → Agents → Add agent** and give the generated token only to that agent. Confirm the token belongs to the same server and active agent record. Deleting and recreating the record invalidates the old token.

Do not substitute a user API token, forge OAuth secret, registry password, or `WOODPECKER_GRPC_SECRET`. They serve different purposes.

## Persist the Agent Identity

With system-token registration, persist the directory containing `WOODPECKER_AGENT_CONFIG_FILE`:

~~~yaml
volumes:
  - woodpecker-agent-config:/etc/woodpecker
~~~

This lets the agent present its registered ID after restart. Losing the file should cause re-registration with a valid system token, but can create confusing duplicate records and label/identity drift. A read-only or unwritable config mount prevents the registered ID from being persisted even though the current registration can succeed.

Check the agent log for a failure to write the config file and verify its ownership.

## Do Not Confuse AGENT_SECRET and GRPC_SECRET

Current server configuration also has `WOODPECKER_GRPC_SECRET`. That is a **server-side secret used to sign gRPC JWTs**. If unset, the server generates a temporary value and warns; the documentation recommends persisting it, especially for high-availability server replicas.

Agents do not receive `WOODPECKER_GRPC_SECRET`. They receive `WOODPECKER_AGENT_SECRET`.

In an HA deployment, every server replica should share the same persistent gRPC signing secret. Otherwise one replica can reject a token issued by another. Rotating the signing secret causes connected agents to reauthenticate; their unchanged agent secret remains the registration credential.

## Inspect Reverse-Proxy Behavior

For a TLS proxy:

- route the gRPC hostname to server port 9000;
- enable HTTP/2 from client and h2c or documented gRPC upstream mode;
- preserve long-lived gRPC requests and HTTP/2 connections;
- avoid an interactive auth middleware on the agent endpoint;
- set timeouts appropriate for gRPC;
- pass the correct SNI/certificate;
- expose the endpoint through every firewall layer.

Correlate one agent attempt:

1. agent log timestamp;
2. edge/load-balancer access log;
3. proxy upstream log;
4. Woodpecker server log.

No edge log means DNS or network. Edge log without upstream means proxy routing. Server connection followed by authentication rejection means token or identity.

## Read the Agent Error Literally

Typical categories:

- `connection refused`: address, listener, or published port;
- `deadline exceeded`: network, proxy, or timeout;
- `transport: authentication handshake failed`: TLS mode or certificate;
- certificate unknown/hostname error: trust chain or SNI;
- `Unauthenticated` or permission rejection: agent token/registration;
- repeated reconnect after a successful handshake: proxy stream timeout, HA signing secret, or server restart;
- no matching workflow despite connected status: labels and capacity, not gRPC.

Temporarily set `WOODPECKER_LOG_LEVEL=debug` on the agent and server when normal logs lack context. Return to a lower level after diagnosis and never log secret values.

## Retry and Health Settings

The agent exposes a health endpoint by default on `:3000`. A healthy process is not necessarily registered and connected, so combine health with the agent's connected state in the server UI.

Current agent settings include:

- `WOODPECKER_CONNECT_RETRY_COUNT`;
- `WOODPECKER_CONNECT_RETRY_DELAY`;
- `WOODPECKER_RETRY_TIMEOUT`;
- `WOODPECKER_KEEPALIVE_TIME` and `WOODPECKER_KEEPALIVE_TIMEOUT` are documented, but a 3.17 wiring bug reads different internal flag names, so that release does not apply them.

Do not hide a permanent address or token error with infinite retry. Fix the root cause, then tune retries for expected brief server or network interruptions. Do not rely on the keepalive settings until your exact release has fixed their wiring.

## End-to-End Checklist

1. Pin and record server and agent versions.
2. Confirm the server listens on `WOODPECKER_GRPC_ADDR`.
3. Point `WOODPECKER_SERVER` at the gRPC host and port, not the UI.
4. Resolve DNS and open TCP from the agent network.
5. Set secure false only for a trusted plaintext path.
6. For TLS, negotiate h2 and verify the hostname and CA.
7. Configure the proxy for gRPC/h2c upstream to port 9000.
8. Use stable 3.17 `GRPC_VERIFY=false` or the version-appropriate `GRPC_SKIP_VERIFY=false` to keep certificate verification enabled.
9. Confirm the same system token or correct per-agent token.
10. Persist and make writable the agent config file.
11. In HA, persist one shared server `GRPC_SECRET`.
12. Correlate agent, proxy, and server logs.
13. Confirm the agent appears connected before debugging labels.

## Official Documentation

- [Woodpecker 3.17 source: Agent configuration](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/docs/docs/30-administration/10-configuration/30-agent.md)
- [Woodpecker 3.17 source: Server gRPC configuration](https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/docs/docs/30-administration/10-configuration/10-server.md)
- [Woodpecker: Docker Compose installation](https://woodpecker-ci.org/docs/administration/installation/docker-compose)
- [Woodpecker: Reverse-proxy server examples](https://woodpecker-ci.org/docs/administration/configuration/server#reverse-proxy)
- [Woodpecker: General architecture](https://woodpecker-ci.org/docs/administration/general)
- [Woodpecker: next migration notes](https://woodpecker-ci.org/migrations#next)
- [Woodpecker 3.17.0 release](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.17.0)

## Conclusion

An agent connection needs the correct gRPC address, a reachable HTTP/2 path, matching TLS expectations, and the correct agent registration token. Prove those layers in that order. On stable 3.17, explicitly use the misleading `GRPC_VERIFY=false`; on `next`, use `GRPC_SKIP_VERIFY=false`. Persist agent identity, and share the server-only gRPC signing secret across HA replicas. Once the UI reports the agent connected, scheduling problems belong to labels and capacity-not the transport.
