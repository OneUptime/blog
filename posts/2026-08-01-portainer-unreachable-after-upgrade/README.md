# Portainer Is Unreachable After an Upgrade: A Container, Port, and Proxy Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Upgrade, Reverse Proxy, Troubleshooting

Description: Restore Portainer access after an upgrade by checking container startup and database logs, persistent storage, HTTPS port mappings, host reachability, and reverse-proxy routing in order.

---

When Portainer is unreachable immediately after an upgrade, preserve the `/data` volume and diagnose from the inside out:

```text
Portainer process -> container port -> host-published port -> firewall -> proxy -> browser
```

Do not delete the Portainer data volume or initialize a fresh instance. The problem is usually a failed process, changed port exposure, wrong startup arguments, storage placement, or stale reverse-proxy route.

## 1. Confirm the Container Is Actually Running

On Docker Standalone:

```bash
docker ps -a --filter name=portainer
docker inspect portainer --format 'status={{.State.Status}} exit={{.State.ExitCode}} error={{.State.Error}}'
docker logs --tail=300 portainer
```

Classify the result:

- **Exited immediately:** read the first fatal log line and exit code.
- **Restarting:** inspect the entire cycle instead of waiting for the UI.
- **Running:** continue to port and network checks.
- **No container:** the deployment command failed or used a different name.

Common startup failures include invalid flags, unreadable custom TLS files, a port already in use, an incompatible database downgrade, permissions on a bind-mounted data path, and a corrupt or unavailable storage mount.

Do not repeatedly restart a container that is actively migrating its database. Let the documented upgrade complete or investigate the fatal error.

## 2. Verify the Exact `/data` Mount

Compare the new container with the pre-upgrade inventory:

```bash
docker inspect portainer \
  --format '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}'
```

There must be one intended persistent source mounted at `/data`. If Portainer shows the initial administrator setup screen, stop and check the mount. Typical causes are:

- `portainer_data` was replaced with a Compose-prefixed volume name or vice versa;
- a relative bind path resolved from a different working directory;
- a Swarm task moved to a node with a different local volume;
- a Kubernetes Pod mounted a new or empty claim;
- the container user cannot read the bind-mounted directory.

Fix the deployment to use the original data. Do not populate the empty instance and create two diverging configurations.

## 3. Check HTTPS and Published Ports

Portainer enables HTTPS on container port `9443` in current 2.x installations. HTTP on `9000` is optional and may not be exposed by the updated command. Edge Agent communication uses `8000` when required; it is not the UI port.

Inspect mappings:

```bash
docker port portainer
docker inspect portainer --format '{{json .HostConfig.PortBindings}}'
```

A typical current mapping includes:

```text
0.0.0.0:9443 -> 9443/tcp
```

Test locally on the host, keeping certificate validation visible:

```bash
curl -vk https://127.0.0.1:9443/
```

Interpret the result:

- **connection refused:** no listener or no published port;
- **timeout:** firewall, route, bind address, or packet filtering;
- **TLS response with an untrusted certificate:** the service is reachable; fix trust or proxy termination rather than opening ports;
- **HTTP redirect or UI content:** move outward to proxy and DNS checks.

If you intentionally retain HTTP, the container must be started with port `9000` exposed according to Portainer's upgrade documentation. Do not assume an old `http://host:9000` bookmark remains valid after switching to the recommended HTTPS command.

## 4. Test Direct Access Before the Reverse Proxy

From an authorized network, request the host-published port directly:

```bash
curl -vk https://portainer-host.example.net:9443/
```

If local access works but remote direct access fails, inspect host firewall, cloud security group, NAT, and routing. Bind the port only on the intended interface and restrict source ranges; do not expose the Docker socket or Portainer admin UI broadly as a troubleshooting shortcut.

If direct access works, the Portainer process and host mapping are healthy. Focus on the reverse proxy.

## 5. Correct Reverse-Proxy Scheme and Upstream Port

An old proxy may still send plain HTTP to port `9000`, while the upgraded container exposes HTTPS on `9443`. Update the upstream consistently:

```text
client HTTPS -> reverse proxy -> Portainer HTTPS:9443
```

or, only when you deliberately expose it:

```text
client HTTPS -> reverse proxy -> Portainer HTTP:9000
```

Do not configure `http://portainer:9443` or `https://portainer:9000` by accident. Check proxy error logs for connection refused, TLS verification, upstream resets, and timeouts.

Also verify:

- the proxy container resolves the Portainer container or Service name;
- both containers share the intended Docker network;
- the upstream certificate trust and server name are correct;
- forwarded host and scheme headers reflect the external URL;
- WebSocket upgrade handling required by the configured Portainer route is preserved;
- proxy timeouts are not shorter than login or console operations.

Test from the proxy's network namespace or an equivalent temporary diagnostic container, not only from the Docker host.

## 6. Separate Browser Symptoms from Server Symptoms

A TLS warning is different from a network failure. After direct `curl` works:

- check the certificate SAN against the public hostname;
- clear an obsolete HSTS or cached redirect only after confirming the intended URL;
- inspect browser developer tools for mixed-content, redirect-loop, API, or WebSocket errors;
- verify SSO redirect and callback URLs still use the public HTTPS origin;
- test a private window to distinguish stale session state.

Do not disable TLS verification globally to make the page open. Install the correct certificate chain or configure proxy trust.

## 7. Handle Database Rollback Correctly

If logs say the database belongs to a newer Portainer version, an older image has been started against an upgraded database. Portainer documents that newer versions commonly bump the schema and older versions cannot consume it.

Either run the intended upgraded image or restore the pre-upgrade Portainer backup into a fresh instance with empty storage. Keep the restored database paired with the compatible image version. Merely changing the tag backward is not a rollback.

## Recovery Checklist

- Portainer process remains running.
- Original `/data` source is mounted and readable.
- Logs show successful startup and migration.
- Host publishes the expected `9443` or intentionally enabled `9000` port.
- Direct local and remote requests reach that port.
- Firewall rules are narrow and correct.
- Proxy upstream scheme, port, DNS, network, and trust match the new deployment.
- Users, environments, and stack definitions remain present after login.
- Deployment manifests are updated so a restart preserves the repair.

Work inward to outward and change one layer at a time. This preserves both the evidence and the data needed for a safe recovery.

## Official Documentation

- [Portainer: Updating on Docker Standalone](https://docs.portainer.io/start/upgrade/docker)
- [Portainer: Install Portainer CE with Docker on Linux](https://docs.portainer.io/start/install-ce/server/docker/linux)
- [Portainer: How Can I Ensure Portainer's Configuration Is Retained?](https://docs.portainer.io/faqs/installing/how-can-i-ensure-portainers-configuration-is-retained)
- [Portainer: Requirements and Prerequisites](https://docs.portainer.io/start/requirements-and-prerequisites)
- [Portainer: Upgrading and Downgrading FAQ](https://docs.portainer.io/faqs/upgrading)
- [Docker: Publishing and Exposing Ports](https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/)
