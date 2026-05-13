# Validation Summary: How to Configure Pod MAC Addresses with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico CNI
- Kubernetes pods
- Linux veth interfaces
- Linux neighbor table

## Sources Consulted
- Calico Open Source documentation: Use a specific MAC address for a pod, https://docs.tigera.io/calico/latest/networking/configuring/pod-mac-address
- Calico Open Source documentation: Frequently asked questions, https://docs.tigera.io/calico/latest/reference/faq
- Calico Open Source documentation: Component architecture, https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico Open Source documentation: Felix configuration, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: Configuring Felix, https://docs.tigera.io/calico/latest/reference/felix/configuration
- Kubernetes documentation: Pod API reference, https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/

## Issues Found
- The post claimed Calico uses a configurable pod MAC prefix and gave a `calicoctl patch felixconfiguration` command using `deviceRouteProtocol`. Calico documentation defines `deviceRouteProtocol` as a route protocol label for routes programmed by Felix, not a MAC address setting. I replaced this with the documented `cni.projectcalico.org/hwAddr` pod annotation.
- The introduction described a default `ee:ee:ee:ee:ee:ee` pod MAC prefix with interface-specific bytes. Calico's FAQ states that `ee:ee:ee:ee:ee:ee` can be assigned to host-side `cali*` interfaces in some setups, and Calico's static MAC documentation says pod `eth0` uses an explicit annotation when needed. I updated the explanation to distinguish pod `eth0` from host-side `cali*` interfaces.
- The duplicate MAC check used `arp -n`, which is legacy compared with `ip neigh`. I changed the example to inspect the Linux neighbor table with `ip neigh show`.
- The pod MAC collection loop read the `kubectl get pods` header as if it were a pod. I added `--no-headers` to avoid the spurious `NAMESPACE/NAME` entry.

## Review Notes
- `calicoctl` was not installed in the local environment, so CLI behavior was checked against official Calico documentation rather than local `--help` output.
- The static MAC annotation must be present when the pod is created; changing the annotation later does not update an already-created pod interface.
