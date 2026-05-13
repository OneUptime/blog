# Validation Summary: How to Monitor Calico on OpenShift Upgrades

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- OpenShift Container Platform
- Kubernetes
- OpenShift CLI (`oc`)
- Kubernetes CLI (`kubectl`)
- Prometheus Operator monitoring resources
- OpenShift Machine Config Operator

## Sources Consulted
- Red Hat OpenShift documentation: Configuring user workload monitoring, including `enableUserWorkload: true` in `cluster-monitoring-config`: https://docs.redhat.com/en/documentation/openshift_container_platform/4.17/html/monitoring/configuring-user-workload-monitoring
- Red Hat OpenShift documentation: MachineConfigPool status columns and meanings for `oc get machineconfigpool`: https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html-single/machine_configuration/index
- Red Hat OpenShift documentation: Platform alerting rules use `monitoring.openshift.io/v1` `AlertingRule` resources in `openshift-monitoring`: https://docs.redhat.com/en/documentation/openshift_container_platform/4.19/html-single/monitoring/monitoring
- Calico documentation: Monitoring Calico component metrics and Calico metric services in `calico-system`: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Tigera Calico Enterprise documentation: ServiceMonitor placement for Prometheus scraping: https://docs.tigera.io/calico-enterprise/latest/operations/monitor/prometheus/byo-prometheus
- OpenShift Machine Config Operator source for MCO metric names (`mco_machine_count`, `mco_updated_machine_count`): https://github.com/openshift/machine-config-operator

## Issues Found
- The shell monitor used `grep -c "${TARGET_VERSION}" || echo 0`. Because `grep -c` prints `0` and exits non-zero when there are no matches, this could set `UPDATED` to two lines of output. Changed it to `grep -c "${TARGET_VERSION}" || true`.
- The cluster operator health check only printed `All operators healthy` if the `oc get co | awk ... | head` pipeline failed, which does not happen when `awk` simply prints no unhealthy operators. Changed the `awk` script to print `All operators healthy` in its `END` block when no unhealthy rows are found.
- The user-workload monitoring command used `oc patch configmap`, which fails if `cluster-monitoring-config` does not already exist. Replaced it with an `oc apply -f -` ConfigMap manifest that matches the OpenShift documentation.
- The ServiceMonitor comment said to apply Calico ServiceMonitors to `openshift-monitoring` while the note correctly said they belong in `calico-system` for this user-workload monitoring case. Updated the comment to `calico-system`.
- The alert used `monitoring.coreos.com/v1` `PrometheusRule` in `openshift-monitoring`. Current OpenShift documentation uses `monitoring.openshift.io/v1` `AlertingRule` for custom platform alerts in `openshift-monitoring`, so the snippet was updated.
- The alert expression referenced a non-existent `mco_machine_config_pool_updating` metric. Replaced it with the MCO machine-count metrics exposed by the Machine Config Operator: `mco_updated_machine_count < mco_machine_count`.
- The DaemonSet metric query did not include a namespace selector. Added `namespace="calico-system"` to avoid matching another `calico-node` DaemonSet name in a different namespace.
- The OpenShift platform alert was missing a severity label and used upstream-style `summary`/`description` annotations. Added `severity: warning` and a `message` annotation to align with OpenShift alerting guidance.

## Review Notes
The local environment did not have `oc` or `kubectl`, so CLI behavior was verified from official documentation and source rather than by executing against a cluster. The alert assumes Calico is deployed as a `calico-node` DaemonSet in `calico-system`, which is consistent with the rest of the post.
