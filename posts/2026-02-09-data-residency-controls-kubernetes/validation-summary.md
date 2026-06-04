# Validation Summary: How to Implement Data Residency Controls for Kubernetes Workloads Across Regions

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes scheduling, node labels, node affinity, topology spread constraints, namespaces, StorageClasses, StatefulSets, Deployments, CronJobs, and admission plugins
- Kubernetes CSI storage drivers for AWS EBS, Google Persistent Disk, and Azure Disk
- OPA Gatekeeper ConstraintTemplates, constraints, and synced inventory
- Prometheus alerting rules and PromQL vector matching
- kube-state-metrics
- GDPR transfer requirements and Canadian PIPEDA cross-border processing guidance

## Sources Consulted
- Kubernetes documentation: Assign Pods to Nodes using Node Affinity - https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes-using-node-affinity/
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Storage Classes - https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes API reference: StorageClass v1 - https://kubernetes.io/docs/reference/kubernetes-api/storage/storage-class-v1/
- Kubernetes documentation: Admission Controllers / PodNodeSelector - https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Gatekeeper documentation: ConstraintTemplates - https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper documentation: Replicating Data / inventory sync - https://open-policy-agent.github.io/gatekeeper/website/docs/v3.6.x/sync/
- Google Kubernetes Engine documentation: Regional Persistent Disks and allowedTopologies - https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/regional-pd
- GCE PD CSI driver documentation: topology key support - https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver
- AWS EKS documentation: Amazon EBS CSI driver - https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- Microsoft AKS documentation: Azure Disk CSI driver - https://learn.microsoft.com/en-us/azure/aks/azure-disk-csi
- Prometheus documentation: Vector matching operators - https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus documentation: Alerting rules - https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- European Data Protection Board: International data transfers - https://www.edpb.europa.eu/sme-data-protection-guide/international-data-transfers_en
- Office of the Privacy Commissioner of Canada: Guidelines for processing personal data across borders - https://www.priv.gc.ca/en/privacy-topics/airports-and-borders/gl_dab_090127/

## Issues Found
- Corrected the legal framing around GDPR. The post originally implied GDPR requires EU personal data to remain in the EU unless transfer mechanisms exist; GDPR is more accurately described as restricting transfers outside the EEA unless adequacy, safeguards, or another transfer mechanism applies.
- Corrected the legal framing around PIPEDA. The post originally said PIPEDA restricts transfers outside Canada; official OPC guidance says PIPEDA does not prohibit transfers outside Canada for processing, but organizations remain accountable and must provide comparable protection.
- Added missing `residency-requirement` labels to Pod templates. The Gatekeeper and Prometheus examples inspect Pod labels, but the original Deployment and StatefulSet only set the residency label on controller metadata, not on the Pods they create.
- Replaced deprecated or removed in-tree storage provisioners (`kubernetes.io/aws-ebs`, `kubernetes.io/gce-pd`, `kubernetes.io/azure-disk`) with current CSI provisioners (`ebs.csi.aws.com`, `pd.csi.storage.gke.io`, `disk.csi.azure.com`).
- Corrected StorageClass topology controls to use CSI-driver topology keys and zone values instead of generic region labels. Added `volumeBindingMode: WaitForFirstConsumer` so volume provisioning accounts for Pod scheduling constraints.
- Updated the Gatekeeper ConstraintTemplate to `templates.gatekeeper.sh/v1` with a structural schema, and changed referential lookups to use Gatekeeper inventory (`data.inventory`) instead of non-existent `data.kubernetes` paths.
- Added a Gatekeeper `Config` resource to sync Namespaces and StorageClasses into inventory, which is required for the PVC policy to evaluate namespace and StorageClass labels.
- Replaced the incorrect PodNodeSelector ConfigMap example with namespace annotations using `scheduler.alpha.kubernetes.io/node-selector`, and added the caveat that this only works when the API server is configured with the PodNodeSelector admission plugin.
- Corrected the Prometheus alert examples so they compare expected residency requirements with actual node or StorageClass compliance labels instead of only checking that labels exist.
- Corrected the audit script to query the generated Gatekeeper constraint resource (`dataresidency.constraints.gatekeeper.sh`) instead of a non-existent generic `constraints dataresidency` resource.

## Review Notes
The examples are still illustrative and assume the referenced CSI drivers, kube-state-metrics label metrics, Prometheus Operator CRDs, Gatekeeper, and any PodNodeSelector admission configuration are installed and enabled in the target cluster. Legal requirements vary by organization, contract, regulator, and jurisdiction, so the compliance framing should be reviewed by counsel before use as policy.
