# Validation Summary: How to Configure RKE2 Server Nodes - Config

## Status
validated

## Post Type
Guide

## Technologies Covered
- RKE2 server configuration
- Kubernetes control plane components
- Kubernetes API server, controller manager, scheduler, and kubelet flags
- etcd and RKE2 datastore configuration
- RKE2 high availability server joins
- CIS hardening profile

## Sources Consulted
- RKE2 Server Configuration Reference (https://docs.rke2.io/reference/server_config)
- RKE2 Configuration Options (https://docs.rke2.io/install/configuration)
- RKE2 High Availability guide (https://docs.rke2.io/install/ha)
- RKE2 Token Management (https://docs.rke2.io/security/token)
- RKE2 External Datastore documentation (https://docs.rke2.io/datastore/external)
- RKE2 Managing Server Roles documentation (https://docs.rke2.io/install/server_roles)
- RKE2 CIS Hardening Guide (https://docs.rke2.io/security/hardening_guide)
- RKE2 Requirements documentation (https://docs.rke2.io/install/requirements)
- Kubernetes kube-apiserver reference (https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)
- Kubernetes kube-controller-manager reference (https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/)
- Kubernetes kube-scheduler reference (https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/)
- Kubernetes kubelet reference (https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/)
- Kubernetes API health endpoints documentation (https://kubernetes.io/docs/reference/using-api/health-checks/)
- etcd configuration options (https://etcd.io/docs/v3.5/op-guide/configuration/)

## Issues Found
1. **Description overstated the coverage.** The post claimed to cover "all available configuration options," but RKE2 has many more server options than the examples shown. Changed this to "important configuration options."
2. **External datastore configuration used incorrect RKE2 keys.** The post used `etcd-endpoint`, `etcd-cafile`, `etcd-certfile`, and `etcd-keyfile` as top-level RKE2 settings. Current RKE2 uses `datastore-endpoint`, `datastore-cafile`, `datastore-certfile`, and `datastore-keyfile` for external datastores, including external etcd. Updated the snippet accordingly.
3. **`disable-etcd` was described incorrectly.** The post described `disable-etcd: true` as the way to use external etcd. In current RKE2, `disable-etcd` is used for dedicated control-plane server roles or embedded SQLite scenarios, while external datastores use `datastore-endpoint`. Updated the comment.
4. **CIS profile example used a deprecated profile name.** Current RKE2 documentation marks `cis-1.23` as deprecated and recommends the generic `cis` profile for supported versions. Changed `profile: cis-1.23` to `profile: cis`.
5. **Controller-manager flag was no longer current.** `pod-eviction-timeout` is not present in the current kube-controller-manager command-line reference. Replaced it with the current `node-eviction-rate` flag.
6. **HA token path was outdated.** Current RKE2 token documentation writes the server join token to `/var/lib/rancher/rke2/server/token`. Updated the command that retrieves the token.
7. **Additional server example used a single server IP instead of the stable endpoint already shown in `tls-san`.** Updated the join URL to `https://k8s.example.com:9345` to align with the RKE2 HA guidance for a fixed registration address.
8. **API server argument inspection could match its own grep process.** Changed the command to use the `[k]ube-apiserver` grep pattern.
9. **The etcd verification command did not actually check etcd health.** Replaced the generic `kubectl get endpoints -n kube-system` command with `kubectl get --raw='/readyz?verbose'`, which includes the API server readiness checks and reports the etcd check.

## Review Notes
- RKE2 v1.32 and newer prefer kubelet configuration files or drop-in directories for kubelet settings, although `kubelet-arg` remains documented by RKE2. Future updates could show a kubelet config-file example for newer clusters.
- RKE2 documentation notes that Ingress NGINX is going end-of-life and that Traefik becomes the default for new clusters starting with RKE2 v1.36. The `disable: rke2-ingress-nginx` example is still a valid packaged-component setting for clusters that deploy that addon, but this area may need version-specific wording later.
