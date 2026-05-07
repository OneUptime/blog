# Validation Summary: How to Install Rancher Behind a Corporate Proxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Docker Engine
- Kubernetes
- Helm
- systemd
- Linux CA trust stores
- HTTP/HTTPS proxy configuration

## Sources Consulted
- Rancher Docs: Installation Requirements — https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher Docs: Installing Rancher on a Single Node Using Docker — https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/rancher-on-a-single-node-with-docker
- Rancher Docs: HTTP Proxy Configuration — https://ranchermanager.docs.rancher.com/reference-guides/single-node-rancher-in-docker/http-proxy-configuration
- Rancher Docs: Advanced Options for Docker Installs — https://ranchermanager.docs.rancher.com/reference-guides/single-node-rancher-in-docker/advanced-options
- Rancher Docs: About Custom CA Root Certificates — https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/custom-ca-root-certificates
- Rancher Docs: Setting up the Bootstrap Password — https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/bootstrap-password
- Rancher Docs: Rancher Helm Chart Options — https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher Docs: Installing Rancher Behind an HTTP Proxy - Install Rancher — https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/rancher-behind-an-http-proxy/install-rancher
- Rancher Docs: Using Fleet Behind a Proxy — https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/use-fleet-behind-a-proxy
- Docker Docs: Daemon proxy configuration — https://docs.docker.com/engine/daemon/proxy/
- Docker Docs: Verify repository client with certificates — https://docs.docker.com/engine/security/certificates/

## Issues Found
- The prerequisites claimed a minimum of 4 GB RAM and 2 CPU cores. Rancher's current documentation defers to the official installation requirements rather than that fixed minimum, so I changed the prerequisite to reference Rancher's current requirements.
- The post instructed readers to `source /etc/environment` after editing it. That does not reliably make the values available to new processes as intended, so I replaced it with the correct guidance to start a new shell session or log back in.
- The Docker CA section incorrectly instructed readers to copy the corporate CA to `/etc/docker/certs.d/docker.io/ca.crt`. On Linux, Docker uses the host CA trust store, and `/etc/docker/certs.d/<registry-hostname>/` is for registry-specific trust, so I corrected the step to restart Docker after updating the system trust store.
- The Rancher container CA step mounted the certificate at `/etc/rancher/ssl/cacerts.pem`, which is not the documented mechanism for adding outbound trust roots for Rancher. I changed it to Rancher's documented `SSL_CERT_DIR` pattern with a mounted certificate directory, and I added container recreation so the command works after Step 5.
- The `NO_PROXY` explanation described `cattle-system.svc` as a namespace. I corrected this to describe it as the namespace DNS suffix used in Rancher's documented proxy configuration.
- The downstream cluster section implied the Rancher UI setting alone was sufficient. I added the required note that private nodes also need the same proxy environment variables configured on the nodes themselves.
- The Helm example was outdated/incomplete in two ways: it omitted `cattle-system.svc` from `noProxy`, and it implied `additionalTrustedCAs=true` alone was enough for TLS-inspecting proxies. I updated the command to a current `helm upgrade --install` form, fixed `noProxy`, and added the required `tls-ca-additional` secret creation step for additional trusted CAs.

## Review Notes
- Rancher's current docs state that single-node Docker installs are for testing and development only; production deployments should use the Helm-based Kubernetes installation path.
- If an authenticated proxy password contains special characters, Docker's systemd proxy configuration may require escaping per Docker's documentation.
