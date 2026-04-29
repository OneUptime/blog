# Validation Summary: How to Configure K3s TLS SAN

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- kubectl
- TLS / X.509 certificates
- OpenSSL
- Linux systemd

## Sources Consulted
- K3s Server CLI docs: https://docs.k3s.io/cli/server
- K3s Configuration Options docs: https://docs.k3s.io/installation/configuration
- K3s Certificate Management docs: https://docs.k3s.io/cli/certificate
- K3s Cluster Access docs: https://docs.k3s.io/cluster-access
- K3s Cluster Load Balancer docs: https://docs.k3s.io/datastore/cluster-loadbalancer

## Issues Found
- The existing-cluster procedure appended a second `tls-san` key directly into `config.yaml`. I changed this to a documented config drop-in using `config.yaml.d` and `tls-san+` so additional SANs are merged instead of creating a duplicate YAML key.
- The post instructed readers to delete `/var/lib/rancher/k3s/server/tls/server-ca.*` and API server certificate files. This was incorrect and unsafe because K3s documents certificate rotation via `k3s certificate rotate`, while CA rotation is a separate `k3s certificate rotate-ca` workflow. I replaced the deletion steps with the supported certificate rotation command.
- The OpenSSL verification commands could hang because `openssl s_client` was left attached to stdin. I updated them to read from `/dev/null`, and added `-servername` for the hostname-based check.
- The remote kubeconfig copy example used `scp` on `/etc/rancher/k3s/k3s.yaml`, which is normally root-readable only. I changed it to `ssh ... 'sudo cat ...'` so the example matches the default K3s file permissions.

## Review Notes
- K3s automatically refreshes the certificates embedded in `/etc/rancher/k3s/k3s.yaml` when the server starts, but copied kubeconfig files must be refreshed manually over time.
- The K3s docs describe `tls-san` as additional SANs on the server TLS certificate, and `tls-san-security` is enabled by default, so load balancer VIPs and external DNS names should be added explicitly.
