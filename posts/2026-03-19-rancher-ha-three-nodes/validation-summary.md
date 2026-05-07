# Validation Summary: How to Set Up Rancher High Availability with Three Nodes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- K3s
- Kubernetes
- embedded etcd
- Helm
- cert-manager
- DNS and load balancing

## Sources Consulted
- Rancher installation requirements: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher install/upgrade on a Kubernetes cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher HA architecture recommendations: https://ranchermanager.docs.rancher.com/v2.11/reference-guides/rancher-manager-architecture/architecture-recommendations
- K3s HA embedded etcd: https://docs.k3s.io/datastore/ha-embedded
- K3s token CLI reference: https://docs.k3s.io/cli/token
- K3s overview and architecture notes: https://docs.k3s.io/
- K3s advanced configuration for etcdctl usage: https://docs.k3s.io/advanced
- K3s etcd snapshot CLI reference: https://docs.k3s.io/cli/etcd-snapshot
- Helm install documentation: https://helm.sh/docs/v3/intro/install/
- cert-manager Helm installation: https://cert-manager.io/docs/installation/helm/
- etcd cluster health checks with etcdctl: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/

## Issues Found
- The DNS section treated DNS round-robin as equivalent to a load balancer for Rancher HA. I changed the prerequisite and DNS steps to require a load balancer and a hostname pointing to it, because Rancher’s HA guidance recommends a Layer 4 load balancer in front of the cluster nodes.
- The etcd verification step used `kubectl get pods -n kube-system | grep etcd`, which is not a valid health check for K3s embedded etcd. I removed that command and kept the node-role verification step, because K3s runs control-plane components inside the `k3s` process rather than exposing embedded etcd as a normal `kube-system` pod.
- The post stated that `replicas=3` ensures one Rancher pod per node. I adjusted that wording to reflect the chart behavior more accurately: three replicas are deployed, and Rancher uses pod anti-affinity to spread them across nodes when possible.
- The failover test told readers to access Rancher through one of the remaining nodes directly. I changed this to the Rancher hostname behind the load balancer, which matches the corrected HA access pattern.

## Review Notes
- No broken commands were found in the K3s join steps, Helm-based cert-manager installation, Rancher Helm installation, or K3s snapshot commands after cross-checking them with the current official documentation.
- The post does not pin Rancher, K3s, or cert-manager versions. That is not inherently incorrect, but readers should still choose a Rancher release first and confirm that the Kubernetes/K3s version they install is supported by the Rancher support matrix at the time they follow the guide.
