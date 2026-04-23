# Validation Summary: How to Configure RKE2 with External etcd

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- etcd
- etcdctl
- TLS client certificate authentication
- CFSSL
- systemd
- YAML configuration

## Sources Consulted
- RKE2 External Datastore documentation: https://docs.rke2.io/datastore/external
- RKE2 Embedded Datastore documentation: https://docs.rke2.io/datastore/embedded
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Managing Server Roles documentation: https://docs.rke2.io/install/server_roles
- etcd v3.5 Configuration Options: https://etcd.io/docs/v3.5/op-guide/configuration/
- etcd v3.5 Clustering Guide: https://etcd.io/docs/v3.5/op-guide/clustering/
- etcd v3.5 Transport Security Model: https://etcd.io/docs/v3.5/op-guide/security/
- etcd GitHub releases: https://github.com/etcd-io/etcd/releases
- CFSSL project documentation: https://github.com/cloudflare/cfssl

## Issues Found
- The etcd configuration referenced certificate files under `/etc/etcd/pki/`, but the guide never created that directory or copied the generated certificates there. Added commands to create `/etc/etcd/pki` and copy the CA, server, and client certificate/key files before writing and starting the etcd service.
- The RKE2 external datastore example set `disable-etcd: true`. Current RKE2 external datastore documentation requires `datastore-endpoint` and the relevant TLS options; `disable-etcd` is documented for embedded SQLite and server role separation, not as a required external datastore setting. Removed it from the external etcd example.

## Review Notes
- RKE2 documentation lists external etcd as certified against etcd 3.5.4. The post's etcd 3.5.x example uses current, valid etcd configuration fields, but production operators should select a patch version that matches their RKE2 version and security policy.
- The certificate example creates one etcd server certificate with SANs for all three etcd nodes. That can work, but the official etcd TLS clustering examples use a unique key pair per member, which is preferable for production isolation and certificate rotation.
- For multiple RKE2 server nodes, RKE2's external datastore documentation also covers using a shared `token` and `server: https://<registration-address>:9345` when joining additional servers. The post focuses on the datastore configuration and does not cover the full HA server join flow.
