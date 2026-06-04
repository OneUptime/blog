# Validation Summary: How to Set Up Oracle Kubernetes Engine (OKE) with Flexible Compute Shapes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Oracle Kubernetes Engine (OKE)
- Oracle Cloud Infrastructure (OCI) CLI
- OCI Compute flexible shapes
- Kubernetes node pools, taints, labels, and tolerations
- Kubernetes Cluster Autoscaler
- Kubernetes Metrics Server
- OCI Monitoring, Limits, and Support APIs
- Python

## Sources Consulted
- Oracle OCI Compute Shapes: https://docs.oracle.com/en-us/iaas/Content/Compute/References/computeshapes.htm
- Oracle OKE Supported Kubernetes Versions: https://docs.oracle.com/en-us/iaas/Content/ContEng/Concepts/contengaboutk8sversions.htm
- Oracle OCI CLI `ce cluster create`: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/ce/cluster/create.html
- Oracle OCI CLI `ce node-pool create`: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/ce/node-pool/create.html
- Oracle OCI CLI `ce node-pool update`: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/ce/node-pool/update.html
- Oracle OKE Cluster Autoscaler guide: https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengusingclusterautoscaler.htm
- Oracle OKE Cluster Autoscaler standalone configuration: https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengusingclusterautoscaler_topic-Working_with_the_Cluster_Autoscaler.htm
- Oracle OCI CLI `limits value list`: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/limits/value/list.html
- Oracle OCI CLI `limits resource-availability get`: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/limits/resource-availability/get.html
- Oracle OCI CLI `support incident create`: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/support/incident/create.html
- Oracle OCI CLI `ce work-request` and `ce work-request-error` docs: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/ce.html

## Issues Found
- The post used Kubernetes `v1.28.2`, which is no longer supported for new OKE clusters. Updated cluster and node-pool examples to `v1.35.2`, a currently supported production OKE version.
- The post claimed `VM.Standard.E3.Flex` uses Intel processors. Corrected this to state that E3.Flex and E4.Flex use AMD EPYC processors.
- The post claimed flexible shapes support fractional OCPU counts. Removed the fractional OCPU claim because the documented E4.Flex limits start at 1 OCPU.
- Several node-pool creation examples omitted `--compartment-id` and node placement subnet information. Added `--compartment-id` and `--subnet-ids` so the examples include the required node-pool context.
- The tainting example tried to apply Kubernetes taints through node `user_data`, which would not reliably have Kubernetes credentials or the right timing. Replaced it with an initial node label and a post-join `kubectl taint nodes -l workload=database` command.
- The autoscaler section used non-existent `oci ce node-pool update --enable-autoscaling`, `--min-size`, and `--max-size` flags. Replaced that with the documented Cluster Autoscaler `--nodes=<min>:<max>:<nodepool-ocid>` approach.
- The autoscaler deployment used the old `k8s.gcr.io` image and the wrong OCI instance-principal environment variable. Updated it to Oracle's documented OCI Cluster Autoscaler image pattern and `OKE_USE_INSTANCE_PRINCIPAL`.
- The autoscaler RBAC was incomplete compared with Oracle's current standalone autoscaler manifest. Added missing node patch permissions, namespace/storage permissions, and the namespaced Role/RoleBinding for ConfigMaps.
- The Python right-sizing example used `math.ceil` without importing `math` and returned a non-rounded memory value. Added `import math` and rounded memory to whole GB.
- The support example used `oci support ticket create`, which is not the current OCI CLI command. Updated it to `oci support incident create` with required parameters.
- The service-limit lookup used `oci limits value get`, which is not available. Updated it to `oci limits resource-availability get`.
- The work-request troubleshooting example filtered `oci ce work-request list` by an unsupported `--resource-id` flag and used `work-request get` for errors. Updated it to list compartment work requests and use `oci ce work-request-error list`.

## Review Notes
- `--subnet-ids` is still shown in the OCI CLI documentation but is marked as deprecated in favor of `nodeConfigDetails` in the API text. A future revision could move all node-pool examples to full JSON input using `nodeConfigDetails`.
- OKE supported Kubernetes versions change over time. The examples were validated against Oracle's published supported-version table on 2026-06-04.
