# Validation Summary: How to Set Up K3s Multi-Node Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s
- Kubernetes
- Embedded etcd
- Nginx TCP load balancing
- `kubectl`
- YAML configuration files

## Sources Consulted
- K3s Architecture: https://docs.k3s.io/architecture
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Token CLI: https://docs.k3s.io/cli/token
- K3s High Availability Embedded etcd: https://docs.k3s.io/datastore/ha-embedded
- K3s Cluster Load Balancer: https://docs.k3s.io/datastore/cluster-loadbalancer
- Kubernetes Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Nodes documentation: https://kubernetes.io/docs/concepts/architecture/nodes/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- `sudo(8)` manual page on the review system, for environment-variable placement when invoking the install script through `sudo`

## Issues Found
- The single-server architecture section described the default datastore as etcd. I corrected it to embedded SQLite, which is the default datastore for single-server K3s.
- The prerequisites listed an incomplete network port set for the HA topology. I added ports `2379-2380` for embedded etcd HA and clarified that port `10250` is needed when using metrics-server.
- Several install commands attached `K3S_TOKEN` and `K3S_URL` to the `sudo` process instead of passing them through `sudo` to `sh`. I corrected the command form so the install script receives those variables when readers run the commands as a non-root user.
- The sample `kubectl get nodes` output hard-coded `v1.28.7+k3s1`, which is outdated for a 2026 post. I replaced it with `vX.Y.Z+k3s1` so the example stays version-neutral.
- The HA agent-registration explanation implied agents continue to connect through the load balancer. I changed it to describe the load balancer as a fixed registration address and clarified that agents can join through an existing server until the load balancer exists.
- The Nginx load balancer example was incomplete because a full `nginx.conf` needs a top-level `events {}` block. I added it and noted that a single Nginx instance is still a single point of failure.
- The HA server config example showed `cluster-init: true` as if it were a generic server config. I clarified that the example is for the first HA server and that additional servers should use `server: "https://192.168.1.99:6443"` instead.
- The config-file example mixed the single-server token name with the HA fixed-registration example. I normalized that section to use `MyHAToken`.

## Review Notes
- The `topologySpreadConstraints` deployment example is valid against current Kubernetes documentation.
- The `kubectl drain agent-02 --ignore-daemonsets --delete-emptydir-data` command remains current in the generated `kubectl drain` reference.
- K3s documentation still shows `control-plane,master` in node-role output examples, so that sample output remains acceptable.
