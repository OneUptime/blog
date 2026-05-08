# Validation Summary: Using the Calico CalicoNodeStatus Resource in Production Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Enterprise
- CalicoNodeStatus
- Kubernetes
- kubectl
- calicoctl
- Typha
- FelixConfiguration

## Sources Consulted
- Calico Enterprise CalicoNodeStatus resource documentation: https://docs.tigera.io/calico-enterprise/latest/reference/resources/caliconodestatus
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Felix configuration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration precedence documentation: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Typha overview documentation: https://docs.tigera.io/calico-enterprise/latest/reference/component-resources/typha/overview
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The post described CalicoNodeStatus as a production configuration mechanism. Updated the introduction and examples to describe it as a temporary troubleshooting/status resource.
- The prerequisites claimed generic Calico v3.26+ support. Updated them to specify Calico Enterprise BGP networking on Linux nodes, matching the official CalicoNodeStatus resource documentation.
- The post recommended broad use in clusters with fewer than 50 nodes and many resources in large clusters. Updated guidance to use CalicoNodeStatus only for targeted nodes and delete resources after troubleshooting, because the official documentation warns against creating many CalicoNodeStatus resources.
- The post claimed CalicoNodeStatus supports node selectors and environment-specific settings. Replaced that with guidance to use labels only to find nodes, then set the exact node name in `spec.node`.
- Replaced `calicoctl get caliconodestatus` examples with `kubectl get caliconodestatus`, matching the official CalicoNodeStatus examples.
- Replaced the incorrect Felix health endpoint curl examples with commands that inspect calico-node probe configuration and logs, because Felix health endpoints depend on Felix health configuration and bind settings.
- Reworked troubleshooting guidance from "configuration not taking effect" to "status not updating", including `spec.updatePeriodSeconds` behavior.
- Fixed the `kubectl auth can-i` example by separating the direct permission check from the `--list` form, matching Kubernetes CLI syntax.

## Review Notes
The post is now technically accurate, but it remains high level. A future improvement would be to include a minimal CalicoNodeStatus YAML manifest with `classes`, `node`, and `updatePeriodSeconds` so readers can see the complete resource shape inline.
