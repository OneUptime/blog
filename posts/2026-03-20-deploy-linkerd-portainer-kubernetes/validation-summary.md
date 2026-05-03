# Validation Summary: How to Deploy Linkerd via Portainer on Kubernetes

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Linkerd (service mesh, linkerd2-proxy)
- Kubernetes
- Portainer (CE / Business Edition)
- Helm (linkerd-crds, linkerd-control-plane, linkerd-viz charts)
- step CLI (smallstep) for certificate generation
- mTLS / TLS certificates
- Prometheus (via Linkerd Viz extension)

## Sources Consulted
- Linkerd Helm install docs: https://linkerd.io/2/tasks/install-helm/
- Linkerd dashboard / golden metrics: https://linkerd.io/2/features/dashboard/
- Linkerd certificate generation: https://linkerd.io/2/tasks/generate-certificates/
- Linkerd automatic cert rotation: https://linkerd.io/2/tasks/automatically-rotating-control-plane-tls-credentials/
- Linkerd Kubernetes version reference: https://linkerd.io/2/reference/k8s-versions/
- Linkerd2 chart source (`charts/linkerd-control-plane/templates/namespace.yaml`, `templates/identity.yaml`, `viz/charts/linkerd-viz/templates/web.yaml`)
- Linkerd CLI install: https://linkerd.io/2/getting-started/

## Issues Found

1. **"Golden metrics" wording in Conclusion (incorrect).** The post listed `(latency, traffic, errors, saturation)` — that's Google's four SRE golden signals, not Linkerd's. Linkerd's official dashboard documentation specifies golden metrics as **success rate, request rate, and latency**. Updated the conclusion to match the official wording.

2. **Identity issuer Secret missing `type: kubernetes.io/tls`.** The Helm values use `identity.issuer.scheme: kubernetes.io/tls`, which requires the referenced Secret to be of type `kubernetes.io/tls` (not the default `Opaque`). Added `type: kubernetes.io/tls` to the Secret manifest in Step 3.

3. **Helm values contradicted the Secret-based scheme.** With `scheme: kubernetes.io/tls`, the `identity.issuer.tls.crtPEM` field is ignored — the chart reads cert/key from the `linkerd-identity-issuer` Secret. Also, the trust anchor (`identityTrustAnchorsPEM`) is a top-level value, not nested under `identity.issuer`. Replaced the misleading `tls.crtPEM` block with a top-level `identityTrustAnchorsPEM` and a comment clarifying that the issuer cert/key come from the Secret created in Step 3.

4. **Missing required namespace label.** The `linkerd-control-plane` chart applies `linkerd.io/control-plane-ns: linkerd` on the control-plane namespace. Added it to the namespace manifest in Step 2 alongside the existing `linkerd.io/is-control-plane` and `config.linkerd.io/admission-webhooks` labels.

5. **Kubernetes minimum version too low.** Post said "Kubernetes 1.21+". Linkerd 2.18 requires Kubernetes 1.22+ and 2.19+ requires 1.29+. Bumped the minimum to `1.22+` to reflect actual current support floor at the conservative end.

## Review Notes

- The Helm repository URL `https://helm.linkerd.io/stable` is the legacy stable channel; current open-source Linkerd releases (2.18+) are published via `https://helm.linkerd.io/edge`. The `/stable` URL still resolves and serves older releases (2.14 era), and Buoyant Enterprise Linkerd is the commercial successor for stable releases. Left as-is since it is still functional; readers targeting the latest open-source Linkerd should switch to `/edge`.
- The CLI install URL `https://run.linkerd.io/install` likewise serves the legacy stable installer. `https://run.linkerd.io/install-edge` is the current edge installer. Both endpoints are still live; left as-is.
- The `step certificate` commands (root-ca and intermediate-ca profiles, `--not-after 8760h`, etc.) match the official Linkerd certificate-generation documentation exactly.
- The `web` pod in `linkerd-viz` listens on container port 8084 (verified in chart source); the port-forward instruction is correct.
- Step 9's `linkerd viz dashboard` will open a local browser session; `&` backgrounds it but keep in mind it terminates with the shell.
- For production deployments, consider using cert-manager with `identity.externalCA: true` for automated certificate rotation rather than manual step-CLI-generated certs.
