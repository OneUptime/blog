# Validation Summary: How to Configure Cluster Autoscaler Priority Expander for Node Pool Selection

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Kubernetes
- Cluster Autoscaler
- Cluster Autoscaler priority expander
- Kubernetes ConfigMaps
- Kubernetes Deployments
- kubectl
- AWS Auto Scaling Group auto-discovery

## Sources Consulted
- Kubernetes Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Cluster Autoscaler priority expander README: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/expander/priority/readme.md
- Cluster Autoscaler priority expander source: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/expander/priority/priority.go
- Cluster Autoscaler AWS cloud provider README: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Amazon EKS Cluster Autoscaler best practices: https://docs.aws.amazon.com/eks/latest/best-practices/cas.html
- Amazon EKS cluster update guidance: https://docs.aws.amazon.com/eks/latest/userguide/update-cluster.html

## Issues Found
- The post said Cluster Autoscaler defaults to the random expander. The upstream FAQ lists `least-waste` as the default, so the description was corrected.
- The post said equal-priority groups fall back to criteria like cost or utilization. The priority expander documentation and source show equal highest-priority groups remain tied and are randomly selected unless additional expanders are chained, so the explanation was corrected.
- The Deployment example mounted the priority ConfigMap at `/etc/kubernetes/priority-expander`. The priority expander reads the `cluster-autoscaler-priority-expander` ConfigMap from the autoscaler namespace through the Kubernetes API, so the unnecessary volume and mount were removed.
- The image used the deprecated `k8s.gcr.io` registry and an old `v1.27.0` example tag. The image was updated to `registry.k8s.io/autoscaling/cluster-autoscaler:v1.34.3`, and the text now notes that the Cluster Autoscaler version should match the cluster's Kubernetes major and minor version.
- The availability-zone section claimed the priority configuration balances workloads across zones. Priority rules express preference, while equivalent node group balancing requires `--balance-similar-node-groups`, so the explanation was corrected.
- The ConfigMap update section implied changes take effect within the polling interval. The priority expander watches/reloads the ConfigMap without a pod restart and uses the updated configuration on subsequent autoscaler evaluations, so the wording was tightened.

## Review Notes
The post is technically relevant and the corrected examples use current Kubernetes API versions. The ConfigMap examples are valid for the priority expander format: integer priorities mapped to lists of regular expressions, with higher positive values preferred. Future updates should keep the Cluster Autoscaler image tag aligned with the Kubernetes minor version used in the deployment example.
