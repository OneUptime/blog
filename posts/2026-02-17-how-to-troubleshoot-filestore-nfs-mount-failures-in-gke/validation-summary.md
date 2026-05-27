# Validation Summary: How to Troubleshoot Filestore NFS Mount Failures in GKE

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud Filestore
- Filestore CSI driver
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- NFS
- Google Cloud CLI
- kubectl

## Sources Consulted
- Google Cloud Filestore CSI driver documentation: https://cloud.google.com/filestore/docs/csi-driver
- Google Cloud Filestore supported protocols documentation: https://docs.cloud.google.com/filestore/docs/about-supported-protocols
- Google Cloud Filestore firewall rules documentation: https://docs.cloud.google.com/filestore/docs/configuring-firewall
- Google Cloud IAM Filestore roles and permissions documentation: https://docs.cloud.google.com/iam/docs/roles-permissions/file
- GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- GKE routes-based cluster documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/routes-based-cluster
- GKE cluster configuration overview: https://cloud.google.com/kubernetes-engine/docs/concepts/configuration-overview
- Google Cloud SDK `gcloud container clusters update` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The networking section said Filestore connectivity only required TCP 2049. This is accurate for NFSv4.1, but Filestore NFSv3 firewall troubleshooting can involve TCP ports 111, 2046, 2049, 2050, and 4045. Updated the wording and checklist to refer to the required NFS ports.
- The debug-pod command described testing from a GKE node, but the command actually runs inside a pod. Updated the wording to say it tests from inside the cluster, and adjusted the `nc` flags to the conventional `nc -zvw 5 HOST PORT` form.
- The VPC-native/routes-based explanation was too absolute. Updated it to match GKE documentation: VPC-native is recommended and the default for new clusters, while routes-based clusters use custom static routes that should be checked during troubleshooting.
- The CSI node-plugin log command claimed to target a specific node but repeated the controller log command. Updated it to first locate the CSI pod on the target node with `kubectl get pods --field-selector spec.nodeName=NODE_NAME`, then run `kubectl logs` for that pod.
- The IAM example used the legacy `serviceAccount:PROJECT_ID.svc.id.goog[NAMESPACE/KSA]` member format for a project IAM binding. Updated it to use the current Workload Identity Federation principal identifier syntax with `principal://.../subject/ns/.../sa/...`.
- The IAM explanation implied that `roles/file.editor` is always required for the GKE service account. Updated it to say the CSI driver identity needs Filestore permissions such as `file.instances.create`, and that managed GKE typically gets these through the Kubernetes Engine service agent while custom or self-managed setups may need `roles/file.editor`.

## Review Notes
The local environment did not have `gcloud` or `kubectl` installed, so CLI verification was done against official Google Cloud SDK and Kubernetes generated reference documentation rather than local `--help` output.
