# Validation Summary: Install Calico on Self-Managed GCE Kubernetes

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Calico
- Tigera Operator
- Kubernetes / kubeadm
- Google Compute Engine
- Google Cloud VPC firewall rules, routes, and MTU
- Calico GlobalNetworkPolicy and NetworkPolicy

## Sources Consulted
- Calico operator installation docs: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico MTU configuration docs: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Google Cloud VPC routes and IP forwarding docs: https://cloud.google.com/vpc/docs/using-routes
- Google Cloud Compute Engine instance update docs: https://cloud.google.com/compute/docs/instances/update-instance-properties
- Google Cloud VPC MTU docs: https://cloud.google.com/vpc/docs/mtu
- Kubernetes NetworkPolicy docs: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Project Calico v3.27.0 manifests on GitHub: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml and https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/custom-resources.yaml

## Issues Found
- The post said it covered both VXLAN and BGP configuration options, but the manifest only configures VXLAN. I changed the wording to say the guide uses VXLAN and includes notes for BGP/no-encapsulation configurations.
- The `calicoctl` prerequisite wrote to `/usr/local/bin` without elevated privileges. I added `sudo` to the `curl` and `chmod` commands.
- The GCE BGP preparation step incorrectly treated `can-ip-forward` as instance metadata and said it was enabled by default. Google Cloud exposes `canIpForward` as an instance property. I replaced the metadata command with a correct `gcloud compute instances create ... --can-ip-forward` example and a verification command for existing nodes.
- The Calico custom resources omitted the `APIServer` resource even though the policy examples use `projectcalico.org/v3`. I added the `APIServer` custom resource, matching the official Calico custom resources flow.
- The verification command waited for `condition=Ready` on `tigerastatus/calico`. TigeraStatus conditions are `Available`, `Progressing`, and `Degraded`, so I changed the wait condition to `Available`.
- The NetworkPolicy section showed Calico policy YAML but no apply command. I added `kubectl apply -f gce-network-policies.yaml`, which works with the Calico API server added to the installation manifest.

## Review Notes
- The post pins Calico to v3.27.0. That is valid for the provided URLs, but Calico has newer releases, so future refreshes should consider updating the version and checking Kubernetes compatibility.
- GCE VPC MTU defaults to 1460 bytes, and 1410 is a reasonable VXLAN MTU derived by subtracting the VXLAN overhead. Custom VPC MTUs require recalculating this value.
