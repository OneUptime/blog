# Validation Summary: How to Configure Typha in a Calico Hard Way Installation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Typha
- Felix
- Kubernetes Deployments, DaemonSets, Services, and NetworkPolicy
- Prometheus Operator ServiceMonitor
- calicoctl

## Sources Consulted
- Calico Open Source documentation: Configuring Typha: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Open Source documentation: Configuring Felix: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source documentation: Calico the hard way, Install Typha: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico Open Source documentation: Calico the hard way, Install calico/node: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico Open Source documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico v3.32.0 Typha configuration source: https://github.com/projectcalico/calico/blob/v3.32.0/typha/pkg/config/config_params.go
- Calico v3.32.0 Felix configuration source: https://github.com/projectcalico/calico/blob/v3.32.0/felix/config/config_params.go
- Calico v3.32.0 FelixConfiguration API source: https://github.com/projectcalico/calico/blob/v3.32.0/api/pkg/apis/projectcalico/v3/felixconfig.go

## Issues Found
- The post used the `calico-system` namespace throughout, but the Calico hard-way Typha and `calico/node` manifests use `kube-system`. Updated commands and manifests to use `kube-system`.
- The connection-limit table incorrectly described `TYPHA_MAXCONNECTIONSLOWERLIMIT` as the point where Typha stops accepting connections and listed incorrect defaults for both connection limits. Updated the descriptions and defaults to match the Calico v3.32.0 Typha configuration source.
- The example set only `TYPHA_MAXCONNECTIONSUPPERLIMIT=300`, which would be lower than the documented default lower limit. Added `TYPHA_MAXCONNECTIONSLOWERLIMIT=250` for the 500-node, 2-replica example.
- The table listed `TYPHA_CONNECTIONREBALANCINGMODE` default as `auto`, but Calico v3.32 accepts `none` or `kubernetes` and defaults to `none`. Updated the default.
- The ServiceMonitor example selected the Typha Service directly and referenced a `metrics` port that did not exist. Added a headless metrics Service with a named `metrics` port and updated the ServiceMonitor selector.
- The post patched `FelixConfiguration` for `typhak8sServiceName`, `typhak8sNamespace`, and `typhaReadTimeout`, but those Typha connection settings are local Felix settings configured through environment variables or the Felix config file, not fields in the `FelixConfiguration` API resource. Updated the examples to set `FELIX_TYPHAK8SSERVICENAME`, `FELIX_TYPHAK8SNAMESPACE`, and `FELIX_TYPHAREADTIMEOUT` on the `calico-node` DaemonSet.
- The verification command checked `FelixConfiguration` for Typha fields that are not present in the resource schema. Updated it to list `calico-node` DaemonSet environment variables.
- The log check searched for the exact string `Sent update`, which is not a stable documented Typha log message. Replaced it with a broader check for connection, sync, or update log lines.

## Review Notes
- The current Calico docs and source are not perfectly aligned on the displayed Typha metrics default in all places, but the post explicitly sets `TYPHA_PROMETHEUSMETRICSPORT=9093`, and the Calico monitoring documentation includes a manifest-mode Typha metrics Service on port 9093.
