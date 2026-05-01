# Validation Summary: How to Deploy a PostgreSQL Cluster with Patroni via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- PostgreSQL
- Patroni
- etcd
- HAProxy
- Docker Compose
- `curl`
- `jq`

## Sources Consulted
- Patroni documentation: Environment Configuration Settings — https://patroni.readthedocs.io/en/latest/ENVIRONMENT.html
- Patroni documentation: Patroni REST API — https://patroni.readthedocs.io/en/latest/rest_api.html
- Patroni documentation: Patroni configuration — https://patroni.readthedocs.io/en/latest/patroni_configuration.html
- Patroni documentation: FAQ (automatic failover / leader race) — https://patroni.readthedocs.io/en/master/faq.html
- Patroni documentation: Dynamic Configuration Settings — https://patroni.readthedocs.io/en/master/dynamic_configuration.html
- etcd documentation: Run etcd clusters inside containers — https://etcd.io/docs/v3.5/op-guide/container/
- etcd documentation: Clustering Guide — https://etcd.io/docs/v3.5/op-guide/clustering/
- etcd GitHub releases — https://github.com/etcd-io/etcd/releases
- Bitnami etcd Docker Hub page — https://hub.docker.com/r/bitnami/etcd/
- HAProxy Configuration Manual — https://docs.haproxy.org/2.8/configuration.html

## Issues Found
- The original etcd example used `bitnami/etcd:3.5` for a three-node Docker/Portainer cluster. Bitnami's current etcd image documentation notes that recent 3.5 releases dropped support for non-Helm cluster deployment, so I replaced that snippet with the official etcd container image and documented bootstrap flags, plus named data volumes.
- The Patroni example used `curl http://localhost:8008/...` later in the post, but the service snippet did not publish the REST API ports. I added explicit Patroni listen settings and port mappings so the REST API commands work from the host as written.
- The Patroni node snippet did not set an explicit cluster scope. I added `PATRONI_SCOPE` on both nodes so the cluster name is defined consistently.
- The HAProxy backend snippet did not explicitly declare `mode tcp`. I added it so PostgreSQL traffic is handled as TCP while Patroni's HTTP health checks still run on port `8008`.
- The failover explanation said the replica with the highest WAL position wins the election and gave overly precise timing. I rewrote that section to match Patroni's documented `leader race` behavior and default `ttl` / `loop_wait` timing model.
- The cluster-check comment was slightly misleading because the `/cluster` output identifies the current `leader`. I adjusted the wording accordingly.

## Review Notes
- The post now validates technically, but it still uses `patroni/patroni:latest`. That is functional, but pinning a specific Patroni image tag in a future revision would make the tutorial more reproducible.
- The guide still uses example passwords and unencrypted intra-cluster traffic. That is acceptable for a lab-style walkthrough, but production deployments should use secrets management, TLS, and tighter network exposure.
