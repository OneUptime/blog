# Drone Runner Cannot Connect to Server: Debug RPC Host, Protocol, Secret, and TLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, CI/CD, Docker, Networking, Troubleshooting

Description: Troubleshoot Drone runner RPC failures by separating address resolution, network reachability, TLS validation, and shared-secret authentication.

When the Drone UI works but a runner cannot connect, the browser has tested a different network path. The runner must reach the Drone server from its own environment and authenticate with its own RPC configuration.

For a Docker runner, investigate in this order: destination, network, TLS, then authentication. This keeps an HTTP routing error from being mistaken for a bad secret.

## Start with the three RPC settings

The connection configuration should have this shape:

```dotenv
DRONE_RPC_HOST=drone.example.com
DRONE_RPC_PROTO=https
DRONE_RPC_SECRET=replace-through-your-secret-manager
```

`DRONE_RPC_HOST` contains the host and an optional port, such as `drone.example.com:8443`. It does not contain `https://` or a UI path. `DRONE_RPC_PROTO` is `http` or `https`. The server and runner must receive the same `DRONE_RPC_SECRET`. [Drone Docker runner installation](https://docs.drone.io/runner/docker/installation/linux/)

The server's public URL settings describe its externally advertised address. They are not automatically copied into the runner. A deployment can intentionally use an internal RPC destination, but that destination still needs correct routing and authentication.

Read recent logs before changing anything:

```bash
docker logs --since 10m drone-runner
```

| Observation | Investigate first |
|---|---|
| Name-resolution error | Hostname and DNS visible to the runner |
| Connection refused | Destination port, listening service, container port mapping |
| Connection timeout | Firewall, routing, proxy, network policy |
| Certificate verification error | Certificate hostname, chain, trust store, time |
| HTTP authentication failure | RPC secret and any intervening authentication gateway |
| HTML instead of an expected RPC response | Wrong destination, redirect, or login proxy |

Treat these as starting points, not a definitive mapping from one log line to one cause.

## Test from the runner's network

If the runner is attached to a Docker network named `ci-control`, use a disposable diagnostic container on that network:

```bash
docker run --rm --network ci-control alpine:3 \
  nslookup drone.example.com

docker run --rm --network ci-control curlimages/curl:latest \
  --connect-timeout 5 --max-time 15 --head https://drone.example.com
```

Choose an approved diagnostic-image digest in a controlled environment. These probes establish DNS and basic HTTPS reachability. They do not authenticate RPC. Compare the resolved address with the endpoint the runner is meant to reach, especially when public and private DNS differ.

Docker network membership belongs to each container. A successful request from the host or a neighboring Compose service does not establish that the runner has the same route. On user-defined Docker networks, container names can resolve within that network. [Docker networking](https://docs.docker.com/engine/network/)

If a reverse proxy is present, check its access and upstream logs for the same time interval. Confirm RPC requests reach Drone without an interactive login challenge or path rewriting. Do not assume a successful login-page response means every application endpoint is reachable.

## Repair TLS trust at the actual client

Use the hostname from `DRONE_RPC_HOST` when inspecting the certificate:

```bash
openssl s_client \
  -connect drone.example.com:443 \
  -servername drone.example.com \
  -verify_hostname drone.example.com \
  -verify_return_error </dev/null
```

Run this where OpenSSL is installed. Its result reflects that process's trust store, so a host-side success does not prove the runner image trusts the same CA. For private certificates, install the appropriate CA chain in the runner's trusted certificate bundle using the image's supported mechanism. Check the server presents intermediates and that the certificate covers the selected hostname.

Keep `DRONE_RPC_SKIP_VERIFY=false`. Drone explicitly documents that bypassing certificate verification is unsafe; replacing trust configuration with a permanent bypass leaves the runner unable to authenticate the server certificate. [RPC certificate verification setting](https://docs.drone.io/runner/docker/configuration/reference/drone-rpc-skip-verify/)

## Compare secrets without printing them

Verify that the server and runner refer to the same secret-manager entry and revision. Check for copied quote characters, accidental whitespace, and one service retaining an old value after rotation. Avoid posting environment dumps, secret hashes, or verbose HTTP bodies into an issue.

After updating the deployment, recreate the affected container or restart the process using a deployment method that injects the new environment. With Compose, use `docker compose up -d` to recreate a service whose environment changed; `docker compose restart` does not apply Compose configuration changes.

Finish by checking for successful server communication in fresh runner logs and running a small eligible pipeline. Successful connectivity followed by a pending build shifts the investigation to runner type, platform, labels, restrictions, and available slots.
