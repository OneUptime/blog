# Validation Summary: Common Mistakes to Avoid with Calico Cluster Diagnostics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Tigera Operator and TigeraStatus
- Kubernetes
- kubectl
- calicoctl
- Prometheus metrics
- Calico IPAM

## Sources Consulted
- Calico documentation: calicoctl cluster diags, https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: TigeraStatus, https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Calico documentation: Monitoring kube-controllers with Prometheus, https://docs.tigera.io/calico-cloud/reference/component-resources/kube-controllers/prometheus
- Kubernetes documentation: kubectl rollout restart, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Calico documentation: Configuring the Calico Kubernetes controllers, https://docs.tigera.io/calico/latest/reference/kube-controllers/configuration

## Issues Found
- The diagnostic collection example used `./collect-calico-cluster-diags.sh`, which is not a documented Calico command and was not defined in the post. Changed it to the documented `calicoctl cluster diags` command.
- The cluster-vs-node troubleshooting example prescribed restarting kube-controllers as the fix for a cluster-wide service connectivity symptom. That was too specific and could be wrong depending on the underlying failure. Changed it to investigate the degraded shared component instead of individual `calico-node` pods.
- The Prometheus alert example used undocumented metric names, `calico_ipam_used_ips` and `calico_ipam_total_ips`. Changed the expression to use the documented kube-controllers IPAM metrics `ipam_allocations_in_use` and `ipam_ippool_size`.
- The `calicoctl ipam check` comments implied exact output strings and narrowed all inconsistencies to leaked IPs. Changed the wording to match the documented behavior: the command checks IPAM data structures against Kubernetes and can report leaked or incorrectly allocated IPs.

## Review Notes
The post is technically relevant and command-heavy, so it was reviewed as a technical guide. Calico metric availability can vary by edition and component configuration; future revisions could mention that kube-controllers Prometheus metrics must be scraped from the configured metrics endpoint.
