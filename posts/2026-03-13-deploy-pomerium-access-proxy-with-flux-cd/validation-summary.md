# Validation Summary: How to Deploy Pomerium Access Proxy with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Pomerium
- Pomerium Helm chart
- Flux CD HelmRelease and Kustomization APIs
- Kubernetes
- NGINX Ingress
- GitHub OAuth Apps
- Redis-backed Pomerium databroker storage

## Sources Consulted
- Pomerium Helm guide: https://www.pomerium.com/docs/guides/helm
- Pomerium Helm repository index: https://helm.pomerium.io/index.yaml
- Pomerium Helm chart 34.0.1 values and templates: https://github.com/pomerium/pomerium-helm/releases/download/pomerium-34.0.1/pomerium-34.0.1.tgz
- Pomerium Routes reference: https://www.pomerium.com/docs/reference/routes
- Pomerium Policy Language reference: https://www.pomerium.com/docs/internals/ppl
- Pomerium GitHub identity provider docs: https://www.pomerium.com/docs/integrations/user-identity/github
- Pomerium Cookie Secret reference: https://www.pomerium.com/docs/reference/cookies
- Pomerium Shared Secret reference: https://www.pomerium.com/docs/reference/shared-secret
- Pomerium TLS route settings: https://www.pomerium.com/docs/reference/routes/tls
- Pomerium Pass Identity Headers reference: https://www.pomerium.com/docs/reference/pass-identity-headers
- Flux HelmRelease reference: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization reference: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The HelmRelease used a non-existent `>=45.0.0 <46.0.0` Pomerium chart range. The live official Helm repository currently publishes `34.0.1` as the latest chart, so the post now pins `34.0.1` and notes that Pomerium no longer actively updates the Helm chart.
- The Helm values used `config.policy`, but the chart and Pomerium config use `config.routes` for route definitions. Updated the values and best-practices text to use `config.routes`.
- The post placed `cookieSecret`, `sharedSecret`, `existingSecret`, and `signingKey` at chart paths that would not configure the chart as intended. Updated the values and Flux `valuesFrom.targetPath` entries to use `config.cookieSecret` and `config.sharedSecret`, and removed the unnecessary signing-key secret because the chart can generate it.
- The shared secret command generated a hex string, while Pomerium documents the shared secret as a base64-encoded 256-bit key. Updated the command to use `openssl rand -base64 32`.
- The policy examples used `github_teams`, which is not a documented Pomerium Policy Language criterion for Pomerium Core. Replaced those examples with documented `domain` and `email` criteria, and clarified that GitHub team membership requires Enterprise directory sync data.
- The prerequisites described Pomerium as a standalone ingress while the example used NGINX Ingress. Updated the prerequisite and added the NGINX backend protocol annotation required when proxying to Pomerium's HTTPS backend.
- The verification text claimed Pomerium verifies GitHub team membership. Updated it to say Pomerium evaluates the route policy after GitHub authentication.

## Review Notes
The local workspace does not have `helm`, `kubectl`, or `flux` installed, so CLI behavior was verified through official documentation and chart templates rather than local command execution. The YAML snippets in the post were parsed successfully after edits.
