# How to Configure Docker to Use a Private Registry on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Docker, Container, Container Registry, Linux

Description: Learn how to configure Docker to Use a Private Registry on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Configure Docker to Use a Private Registry on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- The hostname and port of your private registry, for example `registry.example.com:5000`
- Registry credentials, and the registry CA certificate if it uses a private certificate authority

## Overview

Configuring Docker to use a private registry requires Docker Engine to be installed, the registry endpoint to be trusted, and the Docker client to authenticate to the registry. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
```

## Step 2: Install Required Packages

```bash
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Verify the installation:

```bash
rpm -q docker-ce docker-ce-cli containerd.io
```

## Step 3: Configure the Service

For a private registry that uses a CA not already trusted by the host, copy the CA certificate to Docker's per-registry certificate directory:

```bash
sudo mkdir -p /etc/docker/certs.d/registry.example.com:5000
sudo cp ca.crt /etc/docker/certs.d/registry.example.com:5000/ca.crt
```

If the registry is only available over plain HTTP, configure it as an insecure registry in Docker's daemon configuration. Use this only for trusted test or internal environments, because it allows unencrypted or untrusted communication.

```bash
sudo mkdir -p /etc/docker
sudo vi /etc/docker/daemon.json
```

Add the registry hostname and port:

```json
{
  "insecure-registries": ["registry.example.com:5000"]
}
```

Skip the `insecure-registries` setting when the registry uses valid HTTPS.

## Step 4: Start and Enable the Service

```bash
sudo systemctl enable docker
sudo systemctl restart docker
sudo systemctl status docker
```

## Step 5: Verify the Configuration

Log in to the private registry:

```bash
docker login registry.example.com:5000
```

Pull an image from the registry to confirm Docker can reach it:

```bash
docker pull registry.example.com:5000/my-team/my-image:latest
```

## Step 6: Configure Firewall Rules

If this RHEL host also runs the private registry service, open the registry port. A registry listening on port `5000` needs a port rule, because `firewalld` does not provide a built-in Docker registry service name on a default RHEL installation:

```bash
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show docker --property=MemoryCurrent
docker system df
docker stats
```

## Security Considerations

- Use HTTPS and a trusted CA certificate for the registry whenever possible
- Use `docker login --password-stdin` for scripts so passwords are not stored in shell history
- Restrict access with firewall rules
- Keep packages updated with `dnf update`
- Avoid `insecure-registries` outside trusted development or isolated internal networks

## Troubleshooting

Common issues and solutions:

1. **Docker fails to start**: Check `journalctl -u docker -xe` for JSON syntax errors in `/etc/docker/daemon.json`
2. **Certificate errors**: Verify the registry CA certificate is named `ca.crt` under `/etc/docker/certs.d/<registry-host>:<port>/`
3. **Authentication fails**: Run `docker login registry.example.com:5000` and verify the registry address does not include a URL path
4. **Port conflicts**: Use `ss -tlnp` to identify processes using the registry port

## Conclusion

You have successfully configured Docker to use a private registry on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
