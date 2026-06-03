# Validation Summary: How to Rotate Kubernetes API Server Serving Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubeadm
- Kubernetes PKI certificates
- OpenSSL
- systemd timers
- Prometheus / Blackbox Exporter monitoring

## Sources Consulted
- Kubernetes Certificate Management with kubeadm: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/
- Kubernetes kubeadm certs command reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-certs/
- Kubernetes kubeadm init phase command reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init-phase/
- Kubernetes kubeadm configuration API v1beta4: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes kubeadm kubeconfig command reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-kubeconfig/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Prometheus Blackbox Exporter multi-target exporter guide: https://prometheus.io/docs/guides/multi-target-exporter/
- OpenSSL x509 command documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSL req command documentation: https://docs.openssl.org/3.2/man1/openssl-req/

## Issues Found
- The introduction stated that the API server serving certificate always expires after one year and must be rotated manually. Updated this to scope the one-year default to kubeadm-managed clusters and note that kubeadm upgrades or automation can renew certificates.
- The post used `touch /etc/kubernetes/manifests/kube-apiserver.yaml` as the restart mechanism. Replaced this with the documented static pod restart approach of temporarily removing and restoring the manifest after waiting for kubelet's file check interval.
- The SAN example used `apiVersion: kubeadm.k8s.io/v1beta3`. Updated it to the current kubeadm `v1beta4` configuration API.
- The SAN regeneration example omitted the requirement that `kubeadm init phase certs apiserver` skips generation when `apiserver.crt` and `apiserver.key` already exist. Added commands to move the existing certificate and key before regeneration.
- The systemd automation snippet wrote files under `/usr/local/bin` and `/etc/systemd/system` with shell redirection that would fail for non-root users. Replaced those heredocs with `sudo tee` and changed `chmod` to `sudo chmod`.
- The client configuration section implied kubeconfigs must be updated after serving certificate rotation. Reworded it to apply to kubeconfig client certificate renewal, which is when copied kubeconfig files need updating.
- The Prometheus alert used `apiserver_client_certificate_expiration_seconds`, which monitors client certificates used to authenticate requests to the API server, not the API server serving certificate. Replaced it with a Blackbox Exporter serving-certificate probe metric and noted that the example assumes probing the API endpoint.
- The troubleshooting SAN regeneration command had the same existing-certificate skip problem as the SAN section. Added commands to move the existing certificate and key before regenerating.

## Review Notes
The post is now technically valid for kubeadm-managed clusters using current kubeadm documentation. The Prometheus alert snippet assumes a working Blackbox Exporter scrape job named `kubernetes-apiserver`; future revisions could add the scrape configuration, but that would be an expansion rather than a correctness fix.
