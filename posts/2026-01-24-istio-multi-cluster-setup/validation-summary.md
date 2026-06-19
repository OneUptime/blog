# Validation Summary: How to Handle Istio Multi-Cluster Setup

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Istio multi-cluster service mesh
- Istio east-west gateways
- IstioOperator
- Istio Gateway and DestinationRule resources
- istioctl
- kubectl

## Sources Consulted
- Istio documentation: Install Multicluster - https://istio.io/latest/docs/setup/install/multicluster/
- Istio documentation: Before you begin - https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio documentation: Install Multi-Primary on different networks - https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio documentation: Verify the installation - https://istio.io/latest/docs/setup/install/multicluster/verify/
- Istio documentation: Deployment Models - https://istio.io/latest/docs/ops/deployment/deployment-models/
- Istio documentation: Troubleshooting Multicluster - https://istio.io/latest/docs/ops/diagnostic-tools/multicluster/
- Istio documentation: Plug in CA Certificates - https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio reference: Destination Rule - https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio sample: expose-services.yaml - https://raw.githubusercontent.com/istio/istio/master/samples/multicluster/expose-services.yaml
- Istio sample: helloworld.yaml - https://raw.githubusercontent.com/istio/istio/master/samples/helloworld/helloworld.yaml

## Issues Found
- The post described a shared external control plane as deprecated and replaced by primary-remote. Current Istio documentation still describes external control planes as a supported deployment model, so this was corrected to "External Control Plane" with accurate wording.
- The prerequisites said a common trust domain could substitute for shared root CA certificates. Istio multi-cluster requires established trust, commonly through a shared root of trust, so this was corrected.
- The certificate generation commands used `istio-*/tools/certs/Makefile.selfsigned.mk` after changing into the `certs` directory. Official Istio certificate instructions use `../tools/certs/Makefile.selfsigned.mk`, so the commands were corrected.
- The post created `istio-system` before installation but did not label it with the network. Current Istio multi-network docs require labeling an existing `istio-system` namespace with `topology.istio.io/network`, so label commands were added.
- The post referenced `expose-services-cluster2.yaml` without defining it. The gateway manifest was renamed to reusable `expose-services.yaml` and applied to both clusters.
- Istio networking examples used `networking.istio.io/v1beta1`. Current Istio examples and references use `networking.istio.io/v1`, so the Gateway and DestinationRule examples were updated.
- The HelloWorld image omitted the official `:1.0` tag, and the Service port was unnamed. The image tag and `http` port name were added to match Istio's official sample patterns.

## Review Notes
The guide remains intentionally simplified. For production, Istio recommends using a production-ready CA rather than the demo self-signed certificate Makefile, and protecting east-west gateways from unwanted public exposure.
