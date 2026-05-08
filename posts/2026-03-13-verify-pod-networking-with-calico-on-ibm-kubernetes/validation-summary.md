# Validation Summary: Verify Pod Networking with Calico on IBM Kubernetes Service

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- IBM Kubernetes Service
- IBM Cloud CLI Kubernetes Service plug-in (`ibmcloud ks`)
- Kubernetes NetworkPolicy
- Calico and `calicoctl`
- Kubernetes pods, namespaces, and service DNS
- IBM Cloud Logs / Kubernetes API server audit logs

## Sources Consulted
- IBM Cloud Docs: Controlling traffic with network policies - https://cloud.ibm.com/docs/containers?topic=containers-network_policies
- IBM Cloud Docs: Controlling traffic between pods with Kubernetes policies - https://cloud.ibm.com/docs/containers?topic=containers-vpc-kube-policies
- IBM Cloud Docs: Debugging Calico components - https://cloud.ibm.com/docs/containers?topic=containers-calico_log_level
- IBM Cloud Docs: Check the health of cluster components and networking pods - https://cloud.ibm.com/docs/containers?topic=containers-debug_pods
- IBM Cloud Docs: IBM Cloud Kubernetes Service CLI reference - https://cloud.ibm.com/docs/containers?topic=containers-kubernetes-service-cli
- IBM Cloud Docs: Reviewing service, API server, and worker node logs - https://cloud.ibm.com/docs/containers?topic=containers-health-audit
- Kubernetes Docs: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico Docs: `calicoctl get` command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Docs: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Docs: HostEndpoint resource - https://docs.tigera.io/calico/latest/reference/resources/hostendpoint

## Issues Found
- The introduction claimed IBM Cloud extends Calico with additional enterprise features. I changed this to IBM Cloud providing default Calico policies and supported configuration paths, which is what IBM documents for IKS.
- The prerequisites mentioned `calicoctl` configuration without the IBM-supported command. I added `ibmcloud ks cluster config --cluster <cluster-name> --admin --network`, which IBM documents for Calico CLI access.
- The Calico pod commands only checked `kube-system`. IBM documents `calico-system` for Kubernetes 1.29 and later and `kube-system` for 1.28 and earlier, so I added current-version checks with a fallback.
- The example GlobalNetworkPolicy command referenced `allow-ibm-ports`, which is not a documented default policy name. I changed it to `allow-all-private-default`.
- The NetworkPolicy allowed port `8080`, but the NGINX connectivity test used port `80`. I changed the policy to allow port `80` and added `kubectl wait` commands before testing.
- The BusyBox `wget` command used a long timeout option that is less portable. I changed it to `-T 5`.
- The IKS-specific integration section implied IBM operator and ServiceMonitor resources that are not guaranteed in every cluster. I changed these to Calico operator and optional Prometheus Operator checks.
- The best practices recommended an IBM Cloud Kubernetes network policy dashboard and IBM Cloud Activity Tracker for network policy changes. I replaced these with IBM's documented Kubernetes API server audit logs through IBM Cloud Logs or an external server, and `kubectl`/`calicoctl` review.
- The post used `calicoctl node status`, which Calico documents as requiring direct host access. I replaced it with `calicoctl get nodes -o wide`, which IBM documents for IKS Calico verification.

## Review Notes
IBM's Calico behavior differs by cluster type and Kubernetes version. In particular, IBM's classic-cluster Calico host policies and the `calico-system` namespace for Kubernetes 1.29+ are version-specific details worth keeping visible in future revisions.
