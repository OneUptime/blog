# How to Configure mDNS Name Resolution for Dapr Self-Hosted Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, mDNS, Name Resolution, Self-Hosted, Service Discovery

Description: Learn how to configure and troubleshoot mDNS name resolution in Dapr self-hosted mode for local development and non-Kubernetes environments.

---

## What Is mDNS Name Resolution in Dapr?

When Dapr runs in self-hosted mode (outside Kubernetes), it uses multicast DNS (mDNS) for service discovery by default. mDNS allows Dapr sidecars to discover each other on a local network without a central registry. Each Dapr sidecar advertises itself using its app ID via mDNS and listens for other sidecars.

This makes local development simple - run multiple services and they automatically discover each other.

## Running Multiple Services with mDNS

Start two services locally and observe automatic discovery:

```bash
# Terminal 1: Start order service
dapr run --app-id order-service \
  --app-port 8080 \
  --dapr-http-port 3500 \
  -- go run ./cmd/order-service

# Terminal 2: Start payment service
dapr run --app-id payment-service \
  --app-port 8081 \
  --dapr-http-port 3501 \
  -- go run ./cmd/payment-service
```

The payment service can now invoke the order service by app ID:

```bash
curl http://localhost:3501/v1.0/invoke/order-service/method/orders
```

## Explicit mDNS Component Configuration

Dapr uses mDNS by default in self-hosted mode but you can be explicit in your Dapr configuration file:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "mdns"
    version: "v1"
```

Save this as a configuration file (e.g., `config.yaml`) and reference it via `--config`:

```bash
dapr run --app-id myapp \
  --config ./config.yaml \
  -- ./myapp
```

## Handling Multi-Interface Environments

On machines with multiple network interfaces, mDNS may not resolve correctly. The mDNS component in Dapr does not provide configuration for interface selection, so you may need to adjust your OS network settings or switch to a name resolution component that supports address filtering, such as HashiCorp Consul:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "consul"
    version: "v1"
    configuration:
      selfRegister: true
```

## Testing mDNS Discovery

Verify that your service is discoverable using the Dapr CLI:

```bash
dapr list
```

This shows all running Dapr instances. Each should be visible with its app ID.

Test invocation between services:

```bash
dapr invoke --app-id order-service \
  --method orders \
  --verb GET
```

## Troubleshooting mDNS Issues

mDNS requires multicast to be enabled on the network interface. Common issues:

- Firewall blocking UDP port 5353 (mDNS port)
- VPN software disabling multicast
- Docker network isolation preventing discovery

Check if mDNS traffic is reaching the interface:

```bash
# On macOS/Linux
tcpdump -i any port 5353
```

If discovery fails in containerized environments, consider switching to HashiCorp Consul or SQLite name resolution instead.

Enable debug logging to diagnose:

```bash
dapr run --app-id myapp --log-level debug -- ./myapp 2>&1 | grep -i mdns
```

## mDNS Limitations

mDNS is designed for local network discovery and has limitations:

- Does not work across subnets without mDNS proxy
- May be unreliable in cloud or containerized environments
- Not suitable for production workloads

For production or multi-host setups, use Consul, Kubernetes DNS, or SQLite-based resolution.

## Summary

Dapr uses mDNS for automatic service discovery in self-hosted mode, making local development seamless with zero configuration. Configure the subscriber address family for multi-interface environments. For environments where multicast is unavailable (VPNs, containers, multi-host), switch to a more robust name resolution component like Consul or Kubernetes DNS.
