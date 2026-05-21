# Validation Summary: How to Configure Shared Control Plane in Multi-Cluster Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Kubernetes
- Multi-cluster service mesh
- Istio primary-remote control plane topology
- Istio east-west gateways
- Istio CA certificate plug-in
- istioctl
- kubectl

## Sources Consulted
- Istio official documentation: Install Primary-Remote: https://istio.io/latest/docs/setup/install/multicluster/primary-remote/
- Istio official documentation: Install Primary-Remote on different networks: https://istio.io/latest/docs/setup/install/multicluster/primary-remote_multi-network/
- Istio official documentation: Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio official documentation: Verify the multicluster installation: https://istio.io/latest/docs/setup/install/multicluster/verify/
- Istio official documentation: Using the istioctl command-line tool: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/
- Istio official sample manifest: expose-istiod.yaml: https://raw.githubusercontent.com/istio/istio/release-1.30/samples/multicluster/expose-istiod.yaml
- Istio official sample manifest: expose-services.yaml: https://raw.githubusercontent.com/istio/istio/release-1.30/samples/multicluster/expose-services.yaml

## Issues Found
- The certificate-generation example used ad hoc OpenSSL commands that did not reliably create Istio-compatible CA certificate files and chains. Replaced it with Istio's documented `tools/certs/Makefile.selfsigned.mk` workflow and updated the `cacerts` secret creation to use the generated `ca-cert.pem`, `ca-key.pem`, `root-cert.pem`, and `cert-chain.pem` files.
- The primary cluster configuration omitted `values.global.externalIstiod: true`, which Istio requires for the primary control plane to manage attached remote clusters. Added the missing setting.
- The tutorial created `istio-system` before install but did not set the required `topology.istio.io/network` label on the primary namespace. Added the label command.
- The handwritten east-west gateway and istiod exposure snippets were incomplete for the documented primary-remote flow. Replaced them with Istio's official `gen-eastwest-gateway.sh` and `samples/multicluster/expose-istiod.yaml` usage.
- The remote cluster setup omitted the `topology.istio.io/controlPlaneClusters` annotation and `topology.istio.io/network` label required for the primary istiod to manage the remote cluster and patch remote webhooks. Added both commands.
- The different-network topology requires an east-west gateway in the remote cluster as well as the primary cluster. Added the remote gateway installation and moved service exposure until after both gateways exist.
- The verification workload deployed `helloworld` only in the remote cluster. Istio's multicluster verification guidance creates the service object in both clusters so DNS lookup succeeds. Updated the commands to create the `helloworld` service in both clusters and deploy the workload in the remote cluster.

## Review Notes
- The post uses `release-1.20` sample workload URLs and says `istioctl 1.20+`. The corrected control-plane flow follows the current official Istio primary-remote documentation while preserving the post's version floor. For production, users should keep sample files, `istioctl`, and installed Istio versions aligned.
- The `DISCOVERY_ADDRESS` command reads the LoadBalancer IP field. Some cloud providers populate a hostname instead; users on those platforms may need to read `.status.loadBalancer.ingress[0].hostname` instead.
