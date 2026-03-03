# How to Install Istio Sidecar on Virtual Machines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Virtual Machine, Installation, Service Mesh

Description: Detailed instructions for installing and configuring the Istio sidecar proxy on Linux virtual machines to join them to your Istio service mesh.

---

Installing the Istio sidecar on a VM is different from the Kubernetes experience where injection happens automatically. On a VM, you download and install a package, configure it with the right certificates and connection details, and manage it as a systemd service. This guide covers the installation process in detail for different Linux distributions, along with configuration, iptables setup, and health verification.

## What Gets Installed

The Istio sidecar package for VMs includes:

- **Envoy proxy** - the same proxy that runs as a sidecar in Kubernetes
- **Pilot agent** - manages the Envoy lifecycle, certificate rotation, and health checking
- **iptables rules** - intercept traffic so it flows through Envoy
- **systemd service** - manages the sidecar as a system service

After installation, the pilot agent connects to Istiod, downloads configuration (listeners, routes, clusters, endpoints), and configures the local Envoy instance. All traffic to and from the VM gets intercepted by iptables and routed through Envoy.

## Prerequisites

Before installing the sidecar, you need the bootstrap files generated from the Kubernetes side:

```bash
# Generate on a machine with kubectl access
istioctl x workload entry configure \
  --name my-vm-workload \
  --namespace vm-apps \
  --serviceAccount vm-sa \
  --clusterID cluster1 \
  --output /tmp/vm-config \
  --autoregister
```

This creates:
- `cluster.env` - environment configuration
- `istio-token` - bootstrap JWT token
- `mesh.yaml` - mesh configuration
- `root-cert.pem` - trust root certificate
- `hosts` - additional host entries

Transfer these files to the VM.

## Installation on Debian/Ubuntu

Download the sidecar package for your Istio version:

```bash
ISTIO_VERSION="1.20.0"
curl -LO "https://storage.googleapis.com/istio-release/releases/${ISTIO_VERSION}/deb/istio-sidecar.deb"
```

Install:

```bash
sudo dpkg -i istio-sidecar.deb
```

Verify the installation:

```bash
dpkg -l | grep istio
```

The package installs files to:
- `/usr/local/bin/envoy` - the Envoy binary
- `/usr/local/bin/pilot-agent` - the pilot agent
- `/var/lib/istio/envoy/` - runtime configuration directory
- `/etc/istio/config/` - mesh configuration directory

## Installation on CentOS/RHEL/Amazon Linux

```bash
ISTIO_VERSION="1.20.0"
curl -LO "https://storage.googleapis.com/istio-release/releases/${ISTIO_VERSION}/rpm/istio-sidecar.rpm"
```

Install:

```bash
sudo rpm -ivh istio-sidecar.rpm
```

Or with yum:

```bash
sudo yum localinstall istio-sidecar.rpm -y
```

## Placing Configuration Files

After installing the package, place the bootstrap files in the correct directories:

```bash
# Root certificate for mTLS trust
sudo mkdir -p /etc/certs
sudo cp root-cert.pem /etc/certs/root-cert.pem

# Bootstrap token for initial authentication
sudo mkdir -p /var/run/secrets/tokens
sudo cp istio-token /var/run/secrets/tokens/istio-token

# Cluster environment variables
sudo cp cluster.env /var/lib/istio/envoy/cluster.env

# Mesh configuration
sudo mkdir -p /etc/istio/config
sudo cp mesh.yaml /etc/istio/config/mesh

# Additional hosts (if needed for DNS resolution)
if [ -f hosts ]; then
  sudo sh -c 'cat hosts >> /etc/hosts'
fi
```

Set correct ownership:

```bash
sudo chown -R istio-proxy:istio-proxy /etc/certs
sudo chown -R istio-proxy:istio-proxy /var/run/secrets/tokens
sudo chown -R istio-proxy:istio-proxy /var/lib/istio/envoy
sudo chown -R istio-proxy:istio-proxy /etc/istio/config
```

## Understanding cluster.env

The `cluster.env` file contains environment variables that the pilot agent reads:

```bash
cat /var/lib/istio/envoy/cluster.env
```

Typical contents:

```text
CANONICAL_SERVICE=my-vm-workload
CANONICAL_REVISION=v1
ISTIO_META_CLUSTER_ID=cluster1
ISTIO_META_MESH_ID=mesh1
ISTIO_META_NETWORK=vm-network
ISTIO_META_WORKLOAD_NAME=my-vm-workload
ISTIO_NAMESPACE=vm-apps
POD_NAMESPACE=vm-apps
SERVICE_ACCOUNT=vm-sa
TRUST_DOMAIN=cluster.local
```

You might need to adjust these values. In particular:

- `ISTIO_META_NETWORK` should match your network topology. If the VM is on the same network as your Kubernetes pods, use the same network name. If not, use a different one and set up east-west gateways.
- `ISTIO_META_CLUSTER_ID` must match the cluster name in your Istio installation.

## Understanding mesh.yaml

The mesh configuration tells the sidecar how to reach Istiod:

```yaml
defaultConfig:
  discoveryAddress: istiod.istio-system.svc:15012
  proxyMetadata:
    ISTIO_META_DNS_CAPTURE: "true"
    ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

If the VM cannot reach the Kubernetes service IP directly, update `discoveryAddress` to point to the east-west gateway or a LoadBalancer:

```yaml
defaultConfig:
  discoveryAddress: 34.123.45.67:15012
```

## Starting the Sidecar

```bash
sudo systemctl start istio
```

Enable it to start on boot:

```bash
sudo systemctl enable istio
```

Check the status:

```bash
sudo systemctl status istio
```

View the logs:

```bash
sudo journalctl -u istio -f
```

You should see messages like:

```text
pilot-agent - Starting proxy agent
pilot-agent - Received new config, resetting budget
envoy - Starting Envoy proxy
```

## Verifying the Connection

Check that the sidecar connected to Istiod:

```bash
# On the VM, check Envoy's admin interface
curl localhost:15000/server_info
```

From the Kubernetes side, verify the proxy shows up:

```bash
istioctl proxy-status --context="${CTX_CLUSTER}"
```

Your VM should appear in the list with status SYNCED.

## How iptables Interception Works

The Istio sidecar package sets up iptables rules to intercept traffic. You can view them:

```bash
sudo iptables -t nat -L -n
```

The key chains are:

- `ISTIO_INBOUND` - captures incoming traffic to the VM's application ports
- `ISTIO_REDIRECT` - redirects intercepted traffic to the Envoy listener port (15001)
- `ISTIO_OUTPUT` - captures outgoing traffic from the application

If your application listens on ports that should not be intercepted, configure exclusions in `cluster.env`:

```bash
# Exclude ports from interception
ISTIO_LOCAL_EXCLUDE_PORTS=22,3306
```

This is useful for SSH (port 22) or database ports that you do not want going through Envoy.

## Updating the Sidecar

To update the Istio sidecar on the VM:

```bash
# Stop the current sidecar
sudo systemctl stop istio

# Install the new version
sudo dpkg -i istio-sidecar-new-version.deb
# or
sudo rpm -Uvh istio-sidecar-new-version.rpm

# Start the sidecar
sudo systemctl start istio
```

The bootstrap configuration files do not need to change between minor version upgrades. The JWT token might need to be refreshed if it has expired.

## Troubleshooting

**Sidecar fails to start**: Check journalctl logs. Common issues:

```bash
sudo journalctl -u istio --no-pager | tail -50
```

**Cannot reach Istiod**: Verify network connectivity to the discovery address:

```bash
curl -v ${DISCOVERY_ADDRESS}:15012
```

**Certificate errors**: Make sure root-cert.pem matches the mesh's root CA.

**Traffic not intercepted**: Check iptables rules are in place:

```bash
sudo iptables -t nat -L ISTIO_REDIRECT -n
```

If iptables rules are missing, restart the istio service which should reinstall them.

**Token expired**: Regenerate the bootstrap files and copy the new istio-token to the VM:

```bash
istioctl x workload entry configure \
  --name my-vm-workload \
  --namespace vm-apps \
  --serviceAccount vm-sa \
  --clusterID cluster1 \
  --output /tmp/vm-config-refresh
```

## Summary

Installing the Istio sidecar on a VM involves downloading the platform-specific package (deb or rpm), placing bootstrap configuration files in the correct directories, and starting the systemd service. The sidecar uses iptables to intercept traffic, connects to Istiod for configuration, and participates in the mesh with full mTLS and observability. Pay attention to file ownership, the discovery address configuration, and network labels to ensure a smooth onboarding experience.
