# Validation Summary: How to Migrate Existing Workloads to Calico on OpenShift

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- OpenShift 4.x
- OVN-Kubernetes
- Calico Open Source
- Tigera Operator
- Kubernetes CNI
- OpenShift Network Operator
- OpenShift Machine Config Pools
- Multus

## Sources Consulted
- Calico documentation: Migrate from OVN-Kubernetes CNI to Calico, https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/ovn-to-calico
- Calico documentation: System requirements for OpenShift, https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/requirements
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Red Hat OpenShift documentation: Network [operator.openshift.io/v1] API, https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/operator_apis/network-operator-openshift-io-v1
- Red Hat OpenShift documentation: Network [config.openshift.io/v1] API, https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/config_apis/network-config-openshift-io-v1

## Issues Found
- The post said the OpenShift network operator should be disabled by setting `spec.managementState` to `Unmanaged`. Calico's OVN-to-Calico migration documentation instead uses `Network.operator.openshift.io` migration fields so OpenShift can coordinate the CNI migration. I replaced the unmanaged operator step with Machine Config Pool pause commands, migration-state checks, stale migration clearing, and `spec.migration.networkType: Calico`.
- The post used `oc get network.config cluster`, which is ambiguous and did not match the documented OpenShift API resource name. I changed it to `oc get Network.config.openshift.io cluster` and also added a backup of `Network.operator.openshift.io cluster`.
- The "scale down" step only recorded deployments and did not actually scale them down. I updated it to save namespace, deployment name, and replica count, then scale those user deployments to zero.
- The Calico install commands referenced `https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/tigera-operator.yaml` and `calico-scc.yaml`, which are not the current OpenShift installation flow and are not the URLs used by the official migration guide. I replaced them with the OpenShift `ocp.tgz` bundle for Calico v3.32.0 and the documented manifest application sequence.
- The inline `Installation` custom resource assumed a fixed pod CIDR of `10.128.0.0/14`. That may be correct for a default OpenShift install but is not generally safe for existing clusters. I removed the hard-coded CR and used the OpenShift migration bundle's CR manifests instead.
- The post described node-by-node uncordoning and pod deletion as the migration mechanism. The official Calico procedure instead waits for Calico availability, patches `Network.config.openshift.io` to `Calico`, restarts Multus, clears migration state, and removes the OVN-Kubernetes configuration. I replaced the node-by-node restart step with the documented Multus restart and final migration patches.
- The post did not restore saved deployment replica counts or unpause Machine Config Pools. I added commands to restore deployment replicas and re-enable Machine Config Pool updates after verification.
- The post stated that all pods would be restarted and still referred to nodes being cycled after the node-by-node procedure was removed. I softened that claim to networking components and affected pods being restarted, and updated the verification text to refer to migration completion.
- The verification command used `grep -v Running | grep -v Completed`, which can still print the table header and is less precise than using Kubernetes field selectors. I replaced it with `oc get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded`.
- The prerequisite "An OpenShift 4.x cluster" was too broad. Current Red Hat API documentation notes that some network type migration fields are deprecated or rejected in newer releases, so I narrowed the prerequisite to an OpenShift 4.x release supported by Calico's OVN-to-Calico migration procedure.

## Review Notes
The corrected post follows Calico's current OpenShift migration documentation as of 2026-05-13. Because OpenShift network migration support is version-sensitive, operators should verify their exact OpenShift release and support policy with Red Hat and Tigera before applying the procedure in production.
