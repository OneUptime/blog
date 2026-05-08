# Validation Summary: Upgrade Calico on Self-Managed AWS Kubernetes Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- kubectl
- calicoctl
- AWS EC2 and VPC route tables
- kOps

## Sources Consulted
- Calico documentation: Upgrade Calico on Kubernetes, https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico documentation: Configure BGP peering, https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: Overlay networking, https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl version, https://docs.tigera.io/calico/latest/reference/calicoctl/version
- AWS CLI Command Reference: describe-route-tables, https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-route-tables.html
- Kubernetes kubectl reference: rollout, https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- kOps documentation: rolling-update cluster, https://kops.sigs.k8s.io/cli/kops_rolling-update_cluster/
- Project Calico v3.28.0 manifests on GitHub, https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/tigera-operator.yaml

## Issues Found
- The post described BGP peering with AWS VPC route tables. AWS VPC route tables are not BGP peers, so the introduction now distinguishes Calico BGP between nodes, route reflectors, or external routers from AWS route table entries used by some non-overlay designs.
- The post claimed a zero-disruption upgrade. Calico and kOps rolling upgrades reduce disruption risk, but disruption-free behavior is not guaranteed, so this was changed to low-disruption and risk reduction wording.
- The prerequisite said `calicoctl` should match only the current Calico version. Calico documentation warns not to use older `calicoctl` after upgrade, so this now says to use the current version before upgrade and the target version after upgrade.
- The BGP status checks used `calicoctl node status` as if it could be run from any admin workstation. Calico documentation states the command communicates with the local Calico agent and must be run on the node being inspected, so the commands now use SSH to the target node.
- The operator upgrade command omitted documented server-side conflict handling. The command now uses `kubectl apply --server-side --force-conflicts`.
- The rolling upgrade step reapplied the default v3.28.0 `custom-resources.yaml`. That file contains default installation settings, including the default IP pool CIDR and encapsulation, and should not be applied blindly to an existing customized cluster. The step now verifies the existing `Installation` resource and relies on the upgraded operator to reconcile existing settings.
- The post did not mention the v3.28 OwnerReferences caveat. A pre-upgrade note was added for clusters upgrading to v3.28.0 from earlier versions.

## Review Notes
The AWS route table tag filter uses a placeholder tag key, `tag:cluster`, which is syntactically valid for AWS CLI but must be adapted to the cluster's actual tagging scheme. The guide is operator-focused and assumes an existing operator-managed Calico installation; manifest-based and Helm-based installations require different official upgrade paths.
