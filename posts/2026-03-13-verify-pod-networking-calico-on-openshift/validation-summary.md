# Validation Summary: How to Verify Pod Networking with Calico on OpenShift

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- OpenShift Container Platform
- Kubernetes
- OpenShift CLI (`oc`)
- OpenShift Routes
- OpenShift ingress, DNS, monitoring, and image registry namespaces
- BusyBox command-line utilities

## Sources Consulted
- Calico OpenShift installation guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/hostedcontrolplanes
- TigeraStatus reference: https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- OpenShift route creation documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/latest/html/ingress_and_load_balancing/routes
- OpenShift CIDR range definitions: https://docs.redhat.com/en/documentation/openshift_container_platform/4.13/html/networking/cidr-range-definitions
- OpenShift Ingress Controller endpoint publishing documentation: https://docs.openshift.com/container-platform/4.14/networking/ingress-sharding.html
- OpenShift CLI reference: https://docs.redhat.com/en/documentation/openshift_container_platform/4.10/html/cli_tools/openshift-cli-oc
- BusyBox `wget` help output from the local installed BusyBox 1.36.1

## Issues Found
- The introduction stated that OpenShift router pods run with host networking. OpenShift supports multiple Ingress Controller endpoint publishing strategies, so this is not universally true. Updated the wording to say the ingress router must be able to reach pods, and that router pods might use host networking or service-based publishing depending on configuration.
- The prerequisites listed `calicoctl`, but the guide does not use `calicoctl`. Removed it to avoid requiring an unnecessary tool.
- The system namespace troubleshooting guidance implied GlobalNetworkPolicies are the direct cause of any non-ready system pod after Calico installation. Updated it to start with pod events and logs and then review GlobalNetworkPolicies when symptoms point to blocked traffic.
- The pod-to-pod test used the generic Docker Hub `nginx` image. This is brittle on OpenShift because generic images can fail under OpenShift security constraints or expose different ports than expected. Replaced it with OpenShift's documented `hello-openshift` pod example.
- The BusyBox `wget` command used `--timeout=5`, which is not supported by the local BusyBox 1.36.1 help output. Changed it to the documented BusyBox form `-T 5`.
- The route and DNS examples still referenced the old `server` service after replacing the sample application. Updated them to use `hello-openshift`.
- The pod-to-pod test could run `oc exec` before the pods were Ready. Added `oc wait` commands before executing the connectivity test.
- The conclusion stated that system namespace failures indicate GlobalNetworkPolicies are blocking OpenShift infrastructure traffic. Revised this to "can indicate" because pod failures can have non-network-policy causes.

## Review Notes
The guide is version-neutral and the OpenShift pod CIDR example remains accurate as the documented default, but clusters can customize the pod network during installation. The route test assumes the cluster's ingress domain is reachable from the machine running `curl`.
