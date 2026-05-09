# Validation Summary: How to Troubleshoot Calico on OpenShift HCP

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- OpenShift Container Platform
- OpenShift Hosted Control Planes
- HyperShift
- Kubernetes networking
- Kubernetes and OpenShift CLI commands
- OpenShift Security Context Constraints

## Sources Consulted
- Calico documentation: Install Calico on an OpenShift HCP cluster: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/hostedcontrolplanes
- Calico documentation: OpenShift system and network requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/requirements
- Red Hat OpenShift documentation: Networking for hosted control planes: https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/hosted_control_planes/hcp-networking
- Red Hat OpenShift documentation: Preparing to deploy hosted control planes, CIDR ranges: https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/hosted_control_planes/preparing-to-deploy-hosted-control-planes
- Kubernetes documentation: API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes documentation: kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Red Hat OpenShift CLI documentation for Security Context Constraints policy commands: https://docs.redhat.com/en-us/documentation/openshift_container_platform/4.17/pdf/cli_tools/OpenShift_Container_Platform-4.17-CLI_tools-en-US.pdf

## Issues Found
- The API server connectivity check used `/healthz`, which Kubernetes has deprecated since v1.16. I changed the command to use `/readyz`, which is the current endpoint for checking whether the API server is ready to accept traffic.
- The introduction described SCC issues as inherited from the management cluster. In HCP, the relevant Calico SCC/RBAC checks are against the hosted cluster API. I changed the wording to "SCC or RBAC misconfiguration in the hosted cluster."
- The SCC remediation command referenced `https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/calico-scc.yaml`, which returns 404 and is not how current Calico OpenShift HCP manifests are distributed. I replaced it with the official Calico OpenShift `ocp.tgz` bundle workflow and applying the early namespace/operator/RBAC manifests.
- The kubeconfig section implied manually checking and updating `/etc/kubernetes/kubelet.conf` on worker nodes. Current Calico HCP installation guidance instead configures the Calico `kubernetes-services-endpoint` ConfigMap with `KUBERNETES_SERVICE_HOST`. I changed the section to verify the hosted kubeconfig server and the Calico ConfigMap.

## Review Notes
The post remains a concise troubleshooting guide rather than a full installation guide. Future improvements could mention that Calico HCP eBPF installs require setting `KUBERNETES_SERVICE_HOST`, adding DNS configuration for the API server where required, and disabling kube-proxy through the OpenShift Cluster Network Operator, but those details were not added because they would expand the scope of the article.
