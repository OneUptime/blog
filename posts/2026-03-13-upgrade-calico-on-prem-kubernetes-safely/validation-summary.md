# Validation Summary: How to Upgrade Calico on On-Prem Kubernetes Safely

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- Kubernetes DaemonSets
- BGP peering
- calicoctl
- kubectl

## Sources Consulted
- Calico Open Source upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl installation documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Kubernetes DaemonSet rolling update documentation: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The operator upgrade command applied only `tigera-operator.yaml` with plain `kubectl apply`. The official Calico operator upgrade procedure applies the `projectcalico.org/v3` CRDs first, then applies the operator manifest with server-side apply and `--force-conflicts`. Updated the commands accordingly.
- The post hard-coded Calico v3.27.0, which is outdated for the current official upgrade example. Updated the operator, CRD, and `calicoctl` download examples to v3.32.0.
- The text said the operator itself ensures only one node is transitioning at a time. Kubernetes DaemonSet rolling update settings are the mechanism controlling pod availability during the rollout. Reworded this to describe the default DaemonSet behavior accurately.
- The BGP monitoring command implied `calicoctl node status` could be run generically from anywhere. Official docs state it communicates with the local Calico agent and should be run on the node whose status is being checked. Updated the text and command to reflect node-local execution.
- The prerequisites and conclusion referred to backing up all Calico CRDs. The shown commands back up selected Calico custom resources and the `Installation` resource, not all CRD definitions. Reworded this to "relevant Calico custom resources" / "Calico resources."

## Review Notes
The connectivity test commands are syntactically valid, but in production runbooks it is safer to wait for the test pods to reach `Running` before executing the ping. The `calicoctl` binary example is for Linux AMD64 only; other architectures need the matching release asset.
