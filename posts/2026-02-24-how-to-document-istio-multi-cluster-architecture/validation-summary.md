# Validation Summary: How to Document Istio Multi-Cluster Architecture

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio multi-cluster service mesh
- Kubernetes
- Istio east-west gateways
- Istio remote secrets and endpoint discovery
- Istio DestinationRule locality load balancing
- Istio custom CA and trust-domain configuration
- kubectl, istioctl, jq, OpenSSL

## Sources Consulted
- Istio documentation: Install Multi-Primary on different networks, https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio documentation: Verify the multicluster installation, https://istio.io/latest/docs/setup/install/multicluster/verify/
- Istio reference: istioctl create-remote-secret, https://istio.io/latest/docs/reference/commands/istioctl/
- Istio task: Locality failover, https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio reference: DestinationRule, https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio task: Plug in CA Certificates, https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio release notes: Istio 1.30.0 supported Kubernetes versions, https://istio.io/latest/news/releases/1.30.x/announcing-1.30/

## Issues Found
- The deployment inventory used Istio 1.20.2 with Kubernetes 1.28.x, which is outdated for a 2026 guide. Updated the example to Istio 1.30.0 and Kubernetes 1.32.x to use a supported pairing.
- The Gateway and DestinationRule examples used `networking.istio.io/v1beta1`. Updated them to the stable `networking.istio.io/v1` API used by current Istio documentation.
- The locality-aware routing section claimed traffic stayed in-region unless health dropped below 70%, but the DestinationRule did not configure `minHealthPercent: 70`, and Istio failover is driven by outlier detection and locality policy. Reworded the description to match the actual configuration.
- The network firewall table said clusters need access to istiod on port 15012 for primary-primary control-plane communication. In the documented primary-primary model, Istiod watches remote Kubernetes API servers through remote secrets. Updated the row to remote Kubernetes API server access on TCP 443.
- Several nested Markdown examples had malformed fences, including closing fences labeled as `bash` and a `text` fence in the wrong position. Repaired the fences without changing the article structure.

## Review Notes
The examples are documentation templates rather than a complete install runbook. A future improvement would be to add explicit installation steps for `meshID`, `global.multiCluster.clusterName`, `global.network`, namespace network labels, and applying Istio's `expose-services.yaml` for each east-west gateway.
