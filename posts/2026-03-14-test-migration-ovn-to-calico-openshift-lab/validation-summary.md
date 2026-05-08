# Validation Summary: How to Test Migration from OVN to Calico on OpenShift in a Lab Environment

## Status
validated

## Post Type
Tutorial / Lab guide

## Technologies Covered
- OpenShift 4.x
- OVN-Kubernetes
- Calico Open Source
- Tigera Operator
- Kubernetes NetworkPolicy
- OpenShift CLI (`oc`)
- OpenShift installer
- Bash

## Sources Consulted
- Tigera Calico documentation: Migrate from OVN-Kubernetes CNI to Calico: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/ovn-to-calico
- Tigera Calico documentation: Install an OpenShift 4 cluster with Calico: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/installation
- Tigera Calico documentation: System requirements for OpenShift: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/requirements
- Red Hat OpenShift documentation: install-config networking parameters: https://docs.redhat.com/en/documentation/openshift_container_platform/4.9/html-single/installing/index
- Red Hat OpenShift documentation: DNS Operator and CoreDNS behavior: https://docs.redhat.com/en/documentation/openshift_container_platform/4.8/html/networking/dns-operator
- Kubernetes documentation: Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- OpenShift Cluster Network Operator reference: https://github.com/openshift/cluster-network-operator

## Issues Found
- The original Calico migration commands installed a generic archived Tigera operator manifest and an inline `Installation` CR. That does not match the current Calico OpenShift OVN-to-Calico migration procedure. Updated the example to use the current OpenShift Calico bundle from the Project Calico release, pause Machine Config Pools, set `spec.migration.networkType`, enable kube-proxy for the standard dataplane, wait for `tigerastatus`, set `Network.config.openshift.io` to `Calico`, restart Multus, finalize migration, and unpause Machine Config Pools.
- The representative workload only deployed `web-server`, but the test suite expected `api-server.test-backend.svc.cluster.local`. Added an `api-server` Deployment and Service in `test-backend`.
- The original test commands executed `wget` and `nslookup` inside an `nginx` container, where those tools are not guaranteed to exist. Replaced the sample workload image with an OpenShift-friendly UBI HTTP server image and added a dedicated curl-based `network-test` client.
- The test script used `((PASS++))` and `((FAIL++))` with `set -e`, which can terminate the script on the first increment because Bash returns a non-zero status when the expression evaluates to zero. Changed these to `((PASS+=1))` and `((FAIL+=1))`.
- The bandwidth test attempted to connect to `iperf-server` by pod name without creating a Service. Added `oc expose pod/iperf-server --port=5201` and used the service DNS name for the client.
- The sequence diagram implied the operator drains OVN components directly. Adjusted the diagram wording to reflect applying Calico OpenShift manifests and deploying Calico components.

## Review Notes
The post is now technically consistent with the current Calico OpenShift migration documentation. The examples still assume a disposable lab cluster, cluster-admin access, external image pull access, and a planned network disruption during migration. I did not execute the OpenShift commands because no lab cluster context was available in this workspace.
