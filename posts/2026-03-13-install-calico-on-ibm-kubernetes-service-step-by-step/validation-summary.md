# Validation Summary: Install Calico on IBM Kubernetes Service Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- IBM Kubernetes Service
- IBM Cloud CLI (`ibmcloud ks`)
- Kubernetes
- Calico
- `calicoctl`
- Kubernetes `NetworkPolicy`
- Calico `GlobalNetworkPolicy` and `NetworkPolicy`

## Sources Consulted
- IBM Cloud Kubernetes Service network policies documentation: https://cloud.ibm.com/docs/containers?topic=containers-network_policies
- IBM Cloud Kubernetes Service CLI reference: https://cloud.ibm.com/docs/containers?topic=containers-kubernetes-service-cli
- IBM Cloud Kubernetes Service Calico component troubleshooting documentation: https://cloud.ibm.com/docs/containers?topic=containers-debug_pods
- IBM Cloud Kubernetes Service Calico zero-node troubleshooting documentation: https://cloud.ibm.com/docs/containers?topic=containers-zero_nodes_calico_failure
- IBM Cloud Monitoring for Kubernetes clusters documentation: https://cloud.ibm.com/docs/monitoring?topic=monitoring-kubernetes_cluster
- IBM Cloud sample Calico public network policies: https://github.com/IBM-Cloud/kube-samples/tree/master/calico-policies/public-network-isolation
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico `calicoctl get` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The cluster creation command used `--location` and `--kube-version`, but the current IBM Cloud CLI reference for `ibmcloud ks cluster create classic` uses `--zone` and `--version`. I updated the command and added `ibmcloud ks versions` so readers choose a currently supported Kubernetes version.
- The zone listing command used the older plural form `ibmcloud ks zones`. I changed it to the documented `ibmcloud ks zone ls --provider classic`.
- The `calicoctl` installation command wrote to `/usr/local/bin` without elevated permissions. I added `sudo` to the install and chmod commands.
- The post described managing IP pools on IKS, but IBM documents that changing default Calico components and default `IPPool` resources is not supported. I changed the wording to inspecting IP pools.
- The `calicoctl` configuration example hard-coded an outdated kubeconfig path. I replaced it with the documented `DATASTORE_TYPE=kubernetes` setup after `ibmcloud ks cluster config --network`.
- The verification commands used the `kube-system` namespace for a Kubernetes 1.29-style cluster. IBM documents Calico components in `calico-system` for Kubernetes 1.29 and later, so I updated the namespace and replaced the invalid `calico-node -status` command with `kubectl rollout status daemonset/calico-node`.
- The GlobalNetworkPolicy example used hard-coded IBM load balancer health check IPs that were not supported by the current IBM sample policies. I replaced it with a conservative worker-interface DNS allow example modeled on IBM's region-specific Calico policy samples and directed readers to start from IBM's samples.
- The application policy was labeled as a standard Kubernetes `NetworkPolicy` while using Calico's `projectcalico.org/v3` API and Calico rule fields. I added a valid Kubernetes `networking.k8s.io/v1` NetworkPolicy and separated the Calico-specific equivalent into its own manifest.
- The verification command `calicoctl get networkpolicies -A` did not match the documented `calicoctl` option style. I changed it to `calicoctl get NetworkPolicy --all-namespaces` and added `calicoctl get GlobalNetworkPolicy`.
- The best-practice note referenced a Calico metrics integration for IBM Cloud Monitoring that I could not verify in official docs. I changed it to monitoring Calico pod rollout with `kubectl` and using IBM Cloud Monitoring for Kubernetes cluster and workload metrics.

## Review Notes
The post is technically relevant and valid after the corrections. IBM's sample Calico policies are region-specific and can change as IBM Cloud locations and service ranges change, so readers should treat the examples as starting points and verify them against the current IBM sample repository before production use.
