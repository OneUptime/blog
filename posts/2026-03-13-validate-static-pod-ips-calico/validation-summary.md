# Validation Summary: Validate Static Pod IPs with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source IPAM
- Calico `calicoctl`
- Kubernetes StatefulSet
- Kubernetes pod annotations
- Kubernetes `kubectl`

## Sources Consulted
- Calico documentation: Use a specific IP address with a pod - https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl IPAM overview - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico documentation: IPReservation resource - https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl user reference and supported resource aliases - https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Kubernetes documentation: StatefulSet concepts - https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes documentation: StatefulSet basics - https://kubernetes.io/docs/tutorials/stateful-application/basic-stateful-set/

## Issues Found
- The post said Calico static pod IP annotations reserve specific addresses. Updated this to say the annotation requests a specific address, because Calico documentation states the address must be in a pool and not in use, and separate reservation mechanisms are needed to prevent automatic reuse while the pod is absent.
- The prerequisites did not state that the chosen static IP must be inside a configured Calico IP pool and not already in use. Added this requirement from the Calico static IP documentation.
- The Step 2 command used `calicoctl ipam show --show-blocks | grep "192.168.10.50"` to check a single IP. Replaced it with `calicoctl ipam show --ip=192.168.10.50`, which is the documented single-address lookup.
- The post used `calicoctl ipam check` and `calicoctl ipam check --show-all-ips`, but current Calico Open Source IPAM documentation lists `release`, `show`, and `configure` as IPAM subcommands. Removed those commands from the Open Source workflow.
- The node failure test used cordon plus pod deletion, which validates rescheduling away from a node but does not accurately simulate a node failure. Renamed and reworded the step to describe rescheduling.
- The Step 5 workflow referenced `ipamblock` and a "floating" state. `ipamblock` is not listed as a supported `calicoctl get` resource alias in current Calico Open Source docs, and the "floating" state wording was not supported by the consulted docs. Replaced this with checks for `IPReservation`, `IPPool`, and the current IP allocation.
- The best-practice and conclusion language implied IPAM cleanup/consistency checks protect static addresses. Updated it to recommend `IPReservation` or a manual-assignment IP pool and to frame the final check as preventing accidental address reuse.

## Review Notes
- The StatefulSet example uses one replica, which avoids duplicate static IP requests. If the example is expanded to multiple replicas later, each replica needs a unique IP assignment strategy.
- The StatefulSet references `serviceName: "db"` but does not include a matching headless Service manifest. Kubernetes StatefulSet documentation recommends creating the governing Service for stable network identity. This does not invalidate the Calico static IP annotation example, but a complete StatefulSet example could include the Service in a future revision.
