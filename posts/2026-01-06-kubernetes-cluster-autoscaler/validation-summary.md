# Validation Summary: How to Configure Cluster Autoscaler for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Cluster Autoscaler
- AWS EKS (eksctl, IAM/IRSA, Auto Scaling Groups, Spot instances)
- GCP GKE (built-in autoscaler, autoscaling profiles)
- Azure AKS (built-in autoscaler)
- Prometheus Operator (ServiceMonitor, PrometheusRule)
- Kubernetes scheduling primitives (taints/tolerations, nodeSelector, PriorityClass, PodDisruptionBudget)

## Sources Consulted
- Cluster Autoscaler FAQ & flags: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Priority expander README: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/expander/priority/readme.md
- Cluster Autoscaler on AWS: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- eksctl node group docs: https://eksctl.io/usage/nodegroups/
- GKE cluster autoscaler & autoscaling profiles: https://cloud.google.com/kubernetes-engine/docs/concepts/cluster-autoscaler
- AKS cluster autoscaler: https://learn.microsoft.com/en-us/azure/aks/cluster-autoscaler

## Issues Found
- **Priority expander direction was inverted (factual error).** The post stated "Lower numbers have higher priority" and the example ConfigMap assigned `10` to spot (commented "Highest priority") and `50` to compute ("Lowest priority"). The cluster-autoscaler priority expander selects the option with the **highest** numeric value ("The priority should be a positive value. The highest value wins"). Fixed the sentence to "Higher numbers have higher priority" and swapped the ConfigMap values so spot = `50` (highest) and compute = `10` (lowest), preserving the author's intended preference order (spot first for cost savings).

## Review Notes
- Default values for the tuning flags (`--scale-down-delay-after-add=10m`, `--scale-down-delay-after-failure=3m`, `--scale-down-unneeded-time=10m`, `--scale-down-utilization-threshold=0.5`, `--max-graceful-termination-sec=600`, etc.) match the official defaults.
- The IAM policy, IRSA flow, image path (`registry.k8s.io/autoscaling/cluster-autoscaler`), node-group auto-discovery tag format, expander strategy table, and Prometheus metric names are all accurate.
- Minor stylistic caveat (not corrected, since it is a documentation convention used throughout these posts and does not affect technical correctness): the inline `# comments` placed after the trailing `\` line-continuations in the `eksctl create nodegroup` block would break the command if copy-pasted verbatim, because the backslash escapes the following space rather than a newline. Readers should strip the comments before running it.
- The cluster-autoscaler image is pinned to `v1.28.0`; the post correctly notes the autoscaler minor version should track the Kubernetes control-plane minor version, so readers should bump it to match their cluster.
