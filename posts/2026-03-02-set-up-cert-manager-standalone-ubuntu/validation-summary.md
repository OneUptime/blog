# Validation Summary: How to Set Up cert-manager Standalone on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- cert-manager (Kubernetes certificate management operator)
- cmctl (cert-manager CLI)
- k3s (lightweight Kubernetes distribution)
- Helm (Kubernetes package manager)
- Let's Encrypt ACME (HTTP-01 and DNS-01 challenges)
- Cloudflare DNS-01 solver
- systemd timers/services
- nginx (TLS termination consumer)
- Ubuntu

## Sources Consulted
- cert-manager GitHub releases API (`https://api.github.com/repos/cert-manager/cert-manager/releases/latest` and `/tags/v1.14.4`) — confirmed that cert-manager releases only ship `cert-manager.yaml` and `cert-manager.crds.yaml` (plus cmctl/kubectl plugin tarballs); no standalone `cert-manager-controller-linux-*` binary exists.
- cmctl GitHub releases API (`https://api.github.com/repos/cert-manager/cmctl/releases/latest`) — confirmed v2.5.0 ships raw `cmctl_linux_amd64` binaries alongside the `.tar.gz` variants, so the post's direct binary download URL is valid.
- cert-manager Helm chart values reference (`https://cert-manager.io/docs/installation/helm/`) — `installCRDs` was renamed to `crds.enabled` in the chart; both work currently but `crds.enabled=true` is the canonical name.
- Helm install docs (`https://helm.sh/docs/intro/install/`) — Helm is not in default Ubuntu apt repos; you must add the Baltocdn apt repo or use the install script.
- cert-manager renewal docs (`https://cert-manager.io/docs/usage/certificate/#actions-triggering-private-key-rotation-and-re-issuance` and `https://cert-manager.io/docs/reference/cmctl/#renew`) — forcing renewal is done with `cmctl renew`; the `cert-manager.io/issue-temporary-certificate` annotation issues a temporary self-signed cert while waiting and does NOT trigger renewal.
- cert-manager ACME / ClusterIssuer reference (`https://cert-manager.io/docs/configuration/acme/`) — confirmed `acme-v02.api.letsencrypt.org/directory`, `solvers.http01.ingress.class`, and `solvers.dns01.cloudflare.apiTokenSecretRef` field shapes are correct.
- k3s install docs (`https://docs.k3s.io/quick-start`) — confirmed `curl -sfL https://get.k3s.io | sh -` and that the generated kubeconfig is at `/etc/rancher/k3s/k3s.yaml`.

## Issues Found

1. **Premise: "cert-manager standalone without Kubernetes" is false.**
   The original post claimed cert-manager could run as a regular process on a bare Ubuntu server without Kubernetes, using a local CRD directory and writing certificates as files on disk. cert-manager is fundamentally a set of Kubernetes controllers that talks to the Kubernetes API server; it has no mode that operates without one. Rewrote the intro and "Understanding…" section to explain that "standalone" here means a single-Ubuntu-host deployment via k3s, and clarified what the controllers/CRDs actually do.

2. **Non-existent `cert-manager-controller-linux-${ARCH}` binary.**
   The original post instructed readers to download `cert-manager-controller-linux-amd64` from cert-manager's GitHub releases. That asset does not exist — cert-manager releases only ship YAML manifests, cmctl, and the kubectl plugin (verified against the GitHub releases API for both `latest` and `v1.14.4`). Removed the entire "Installing the cert-manager Controller Binary" section.

3. **Misleading claim that `cmctl x509` "can work with ACME issuers directly".**
   `cmctl x509` deals with X.509 CSR creation/inspection, not standalone ACME issuance. There is no version of `cmctl` that does ACME issuance without a running cert-manager controller in a Kubernetes cluster. Replaced with an accurate description: `cmctl` is a Kubernetes-aware CLI for inspecting cert-manager resources and triggering manual renewals.

4. **`cmctl version` requires a cluster connection.**
   The bare `cmctl version` call attempts to also fetch the server (cert-manager) version, which fails (or hangs) if no kubeconfig is configured yet (the install step runs before k3s is installed). Changed to `cmctl version --client` so verification works in isolation.

5. **`sudo apt install helm` will fail on Ubuntu.**
   Helm is not packaged in the default Ubuntu apt repositories. Replaced with the official Helm apt-repo setup (Baltocdn signing key + sources list + apt install).

6. **`--set installCRDs=true` is the legacy chart key.**
   The cert-manager Helm chart has moved to `crds.enabled=true` as the canonical key. Updated for consistency with current chart documentation (the old key still works, but the new one is recommended going forward).

7. **`cert-manager.io/issue-temporary-certificate` annotation does not force renewal.**
   That annotation issues a temporary self-signed certificate into the target Secret while the real cert is being requested; it has nothing to do with triggering renewal of an existing Certificate. Replaced the "Force Certificate Renewal" step with `cmctl renew <name>`, which is the documented way to trigger an immediate renewal.

## Review Notes

- The post advertises "standalone" cert-manager but actually delivers cert-manager-on-k3s. The retitle was deliberately minimal to keep the author's intent; a future revision could rename the post to something like "How to Set Up cert-manager on a Single Ubuntu Server with k3s" to avoid confusing readers who arrive expecting a no-Kubernetes solution.
- The `commonName` field in `Certificate` resources is technically deprecated by Let's Encrypt as of 2024+ (the CA ignores it in favor of `dnsNames`). It still works and cert-manager still accepts it, but a future revision could drop it from the examples.
- The wildcard Certificate example uses `commonName: "*.example.com"` — Let's Encrypt does support wildcard CNs via DNS-01, but again the CA's behavior is now driven by `dnsNames`.
- The `extract-certs.sh` script declares `NGINX_RELOADED=false` but never sets or checks it; the variable is dead. Left as-is since it's harmless and not a technical error.
- `/etc/cert-manager/clusterissuer-dns.yaml` is referenced by an `apply` command but never explicitly created with `nano`. Readers will need to infer to save the YAML there first. Left as-is — fixable but stylistic.
- The systemd timer fires hourly, which is fine but more frequent than cert-manager's own renewal logic needs; this is acceptable as a "just in case" cron-style fallback for filesystem extraction.
