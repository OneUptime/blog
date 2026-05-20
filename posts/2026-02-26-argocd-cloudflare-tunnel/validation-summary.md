# Validation Summary: How to Configure ArgoCD with Cloudflare Tunnel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Kubernetes Deployments, ConfigMaps, and Secrets
- Cloudflare Tunnel
- cloudflared
- Cloudflare Access / Zero Trust
- DNS CNAME routing

## Sources Consulted
- Cloudflare Tunnel overview: https://developers.cloudflare.com/tunnel/
- Cloudflare locally-managed tunnel setup: https://developers.cloudflare.com/tunnel/advanced/local-management/create-local-tunnel/
- Cloudflare Tunnel routing: https://developers.cloudflare.com/tunnel/routing/
- Cloudflare Tunnel configuration file: https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/
- Cloudflare Tunnel Kubernetes deployment guide: https://developers.cloudflare.com/tunnel/deployment-guides/kubernetes/
- Cloudflare Tunnel origin parameters: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/origin-parameters/
- Cloudflare Tunnel gRPC use case documentation: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/use-cases/grpc/
- Cloudflare Access service tokens: https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/
- Cloudflare Access application API: https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/methods/create/
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/ingress/
- Argo CD CLI login command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/

## Issues Found
- The cloudflared Deployment used a liveness probe on `/ready` port `2000` but did not configure cloudflared to expose metrics/readiness on that port. Added `--metrics 0.0.0.0:2000` to match Cloudflare's Kubernetes deployment guidance.
- The tunnel ConfigMap included top-level `no-tls-verify: true`. Cloudflare documents this origin setting as `noTLSVerify`, and it is only relevant for HTTPS origins. Since the post routes to Argo CD over HTTP on port 80, the setting and related comment were removed.
- The CLI section said Cloudflare Tunnel supports gRPC for this setup. Cloudflare's current gRPC documentation says public hostname deployments are not currently supported for raw gRPC. Reworded the section to explain that Argo CD CLI normally uses gRPC and should use `--grpc-web` for this public hostname setup.
- Updated Cloudflare dashboard navigation text for Access applications and service tokens to match current Cloudflare Zero Trust documentation.

## Review Notes
- The tutorial uses a locally-managed tunnel with a credentials JSON file, which remains supported. Cloudflare's current Kubernetes guide emphasizes remotely-managed tunnels with `TUNNEL_TOKEN`, but the locally-managed approach in this post is still valid.
- The `cloudflare/cloudflared:latest` image works as an example, but pinning a version is preferable for production GitOps workflows.
