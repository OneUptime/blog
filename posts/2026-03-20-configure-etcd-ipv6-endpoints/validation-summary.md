# Validation Summary: How to Configure etcd with IPv6 Endpoints

## Status
validated

## Post Type
Guide

## Technologies Covered
- etcd
- etcdctl
- IPv6 networking
- TLS / X.509 certificates
- Kubernetes static-pod etcd deployments

## Sources Consulted
- etcd v3.6 Configuration options: https://etcd.io/docs/v3.6/op-guide/configuration/
- etcd v3.5 Clustering Guide: https://etcd.io/docs/v3.5/op-guide/clustering/
- etcd v3.6 Transport security model: https://etcd.io/docs/v3.6/op-guide/security/
- etcd tutorial, How to check Cluster status: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- Kubernetes, Operating etcd clusters for Kubernetes: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Kubernetes, IPv4/IPv6 dual-stack: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- RFC 3986, Uniform Resource Identifier (URI): Generic Syntax: https://datatracker.ietf.org/doc/html/rfc3986

## Issues Found
1. The main `etcd` startup example was labeled as if it were a generic single-node start command, but the flags actually define `node1` in a three-member static cluster via `--initial-cluster`. I changed the inline comment and description so the example matches what it configures.
2. The TLS configuration omitted explicit client and peer certificate authentication even though the section recommends the setup for production. I added `client-cert-auth: true` and `peer-client-cert-auth: true`, which matches etcd's transport security guidance for authenticated HTTPS and inter-peer TLS.
3. The TLS section did not mention that certificates used with literal IPv6 HTTPS endpoints need SAN entries for those IPv6 addresses. I added a short note because etcd's TLS verification checks certificate SANs against the IP address being used.
4. The summary claimed that dual-stack Kubernetes requires IPv6-capable etcd. Kubernetes' dual-stack documentation does not make that blanket requirement. I replaced it with the accurate narrower condition: if Kubernetes components connect to etcd over IPv6, the etcd URLs and certificate SANs must include the IPv6 addresses in use.

## Review Notes
- The IPv6 URL syntax shown in the post is correct. RFC 3986 requires literal IPv6 hosts in URIs to be enclosed in brackets.
- The config file keys are valid because etcd configuration files use YAML keys that mirror the command-line flag names.
- I also performed a live sanity check with etcd 3.6.10 bound to `::1`; `etcdctl put/get` succeeded over `http://[::1]:22379`, which confirms the bracketed IPv6 endpoint syntax works in practice.
- `ETCDCTL_API=3` is still accepted, though current `etcdctl` defaults to the v3 API.
