# Validation Summary: How to Migrate to MTU Sizing for Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- MTU configuration
- WireGuard tunnel MTU
- kubectl
- calicoctl / Calico API resources

## Sources Consulted
- Calico documentation: Configure MTU to maximize network performance: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico documentation: FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Cloud documentation: WireGuard encryption FelixConfiguration examples: https://docs.tigera.io/calico-cloud/compliance/encrypt-cluster-pod-traffic
- Kubernetes documentation: kubectl rollout reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post used `FelixConfiguration.spec.mtu` to set workload MTU. Current Calico documentation configures workload MTU through `Installation.spec.calicoNetwork.mtu` for operator installations or `calico-config` `veth_mtu` for manifest based installations. I replaced the command with both supported patterns.
- The post patched `wireguardMTU` alongside a non-existent workload `mtu` field using `calicoctl`. I changed this to a separate `kubectl patch felixconfiguration` command for the WireGuard tunnel MTU only.
- The current-configuration check only inspected FelixConfiguration. I updated it to check the operator Installation resource, manifest `calico-config` ConfigMap, and optional Felix tunnel MTU overrides.
- The pod namespace discovery example parsed `kubectl get pod -A -o name`, which does not reliably include namespace information. I changed it to JSONPath queries for the first pod's namespace and name.
- The verification loop read the header row from `kubectl get pods -A -o wide` as if it were a pod, and only detected one hard-coded old MTU value. I added `--no-headers`, removed the unnecessary wide output, and changed the check to report any pod MTU that does not match the target.
- The namespace restart loop used `kubectl rollout status deployment` without naming a Deployment. Kubernetes documents rollout status as requiring a concrete resource name, so I changed the loop to restart and wait for each Deployment returned by `kubectl get deployment -o name`.
- The prerequisites mentioned node draining, but the procedure performs rolling workload and DaemonSet restarts rather than draining nodes. I changed the prerequisite to require restart permissions.
- The conclusion and flowchart referred specifically to updating FelixConfiguration for the workload MTU. I updated those references to the broader Calico MTU configuration.

## Review Notes
- The rolling restart examples cover Deployments only. In clusters that also run StatefulSets, DaemonSets, Jobs, or bare Pods, operators should restart or recreate those workloads separately.
- The verification command assumes containers have the `ip` command available and that checking `eth0` is sufficient. Minimal images or multi-interface Pods may need an alternate verification method.
