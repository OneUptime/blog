# How to Fix Docker Pull x509 Errors on Photon OS Behind Zscaler or a Corporate Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Docker, Security

Description: Resolve Docker pull certificate errors on Photon OS by validating corporate CA trust and configuring the daemon proxy correctly.

---

An `x509: certificate signed by unknown authority` error during `docker pull` usually concerns the Docker daemon's HTTPS request. Installing a certificate inside the container cannot fix an image pull that happens before the container exists. On a network using Zscaler or another authorized TLS-inspecting proxy, the host must trust the approved issuing CA and the daemon must use the correct proxy route.

## Identify the failing request

Capture the exact error, registry hostname, and timestamp:

```bash
docker pull registry.example.com/team/app:approved
journalctl -u docker --since '15 minutes ago' --no-pager
date -u
```

The registry and image above are placeholders. Check whether the error refers to the registry, an authentication service, or a layer-download endpoint. A pull can involve multiple HTTPS destinations.

A hostname mismatch, expired certificate, and unknown issuer need different repairs. Check guest time, DNS, and the approved proxy configuration first. Obtain the corporate CA through your organization's certificate-distribution process and verify its fingerprint independently; do not trust an arbitrary certificate copied from an unexplained failed connection.

Docker distinguishes host and container trust in its [CA-certificate guidance](https://docs.docker.com/engine/network/ca-certs/). Keep those two verification tasks separate throughout the repair.

## Install the approved CA in the Photon host trust path

Photon's [CA package specification](https://github.com/vmware/photon/blob/5.0/SPECS/ca-certificates/ca-certificates.spec) installs the bundle at `/etc/pki/tls/certs/ca-bundle.crt`. Inspect the local package files rather than assuming Ubuntu's `update-ca-certificates` or another distribution's `update-ca-trust` command exists.

```bash
rpm -q ca-certificates
rpm -ql ca-certificates
ls -l /etc/pki/tls/certs/ca-bundle.crt
openssl x509 -in corporate-root.crt -noout -subject -issuer -fingerprint -sha256
```

Use a PEM-encoded approved CA certificate. Docker's [daemon reference](https://docs.docker.com/reference/cli/dockerd/#running-a-docker-daemon-behind-an-https_proxy) documents adding the proxy CA to this bundle. For a controlled one-time repair, back up the bundle and append the verified CA once:

```bash
cp -p /etc/pki/tls/certs/ca-bundle.crt \
  /etc/pki/tls/certs/ca-bundle.crt.before-corporate-ca
cat corporate-root.crt >> /etc/pki/tls/certs/ca-bundle.crt
```

Ensure the existing bundle ends with a newline before appending. Do not repeatedly append duplicate certificates on every boot. The bundle is package-managed and may be replaced during CA-package maintenance; implement an idempotent configuration-management step that maintains your approved additional trust and retest it after updates.

For a private registry whose CA should be scoped more narrowly, Docker also supports `/etc/docker/certs.d/REGISTRY_HOST[:PORT]/ca.crt`. Its [registry certificate reference](https://docs.docker.com/engine/security/certificates/) explains naming and extension rules. That narrow configuration may not cover a corporate proxy that intercepts separate authentication and download endpoints.

## Configure the daemon's proxy

Setting `HTTPS_PROXY` in your login shell does not change an already running system service. Use a Docker service drop-in, following the [daemon proxy documentation](https://docs.docker.com/engine/daemon/proxy/):

```ini
# /etc/systemd/system/docker.service.d/proxy.conf
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:8080"
Environment="HTTPS_PROXY=http://proxy.example.com:8080"
Environment="NO_PROXY=localhost,127.0.0.1,registry.internal.example.com"
```

Create the drop-in directory first if needed. Replace these values with your actual routing policy. Using an `http://` URL for `HTTPS_PROXY` can be correct: the variable describes HTTPS destination traffic, while the URL specifies how to reach the proxy.

Inspect existing daemon JSON and service overrides for conflicting proxy settings. Docker documents that daemon configuration takes precedence over environment variables, so a conflicting `proxies` entry in `daemon.json` can make a correct service drop-in appear ineffective. Keep one deliberate source of proxy configuration. Avoid putting proxy credentials into a broadly readable file or pasting them into diagnostic output.

Check `NO_PROXY` separately from certificate trust. A bypassed registry must be reachable directly; adding its name to the bypass list does not repair its issuing chain. Conversely, sending an internal registry through a proxy that cannot reach it can produce connection failures unrelated to the CA bundle. Test the exact registry and authentication destinations from the daemon's intended route.

During an approved container-host maintenance window, reload systemd and restart Docker:

```bash
systemctl daemon-reload
systemctl restart docker
```

Account for workload interruption before restarting the daemon. A trust repair should not unexpectedly become an application outage.

## Validate both layers

Repeat the exact failed pull and inspect the journal. Then run an application container and test its outbound HTTPS separately. A Java, Python, or other runtime may maintain its own trust configuration even after the host is repaired.

Do not use `insecure-registries` or disable TLS verification as the permanent answer. Finish by recording the approved CA fingerprint, expiry, proxy route, and configuration owner. Retest after certificate rotation and CA-package updates so the next trust-chain change becomes a planned maintenance event.
