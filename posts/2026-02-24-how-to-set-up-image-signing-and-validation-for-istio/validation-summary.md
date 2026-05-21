# Validation Summary: How to Set Up Image Signing and Validation for Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Cosign and Sigstore
- Kubernetes admission control
- Kyverno
- Connaisseur
- OPA Gatekeeper
- Helm
- GitHub Actions

## Sources Consulted
- Istio Image Signing and Validation: https://istio.io/latest/docs/ops/best-practices/image-signing-validation/
- Sigstore Cosign signature verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Kyverno ImageValidatingPolicy documentation: https://kyverno.io/docs/policy-types/image-validating-policy/
- Kyverno Sigstore image verification documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Connaisseur basic configuration documentation: https://sse-secure-systems.github.io/connaisseur/latest/basics/
- Connaisseur Cosign validator documentation: https://sse-secure-systems.github.io/connaisseur/latest/validators/sigstore_cosign/
- OPA Gatekeeper how-to documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Helm pull documentation: https://helm.sh/docs/helm/helm_pull/
- Helm verify documentation: https://helm.sh/docs/helm/helm_verify/

## Issues Found
- The post described Istio image signing as keyless GitHub OIDC signing. Istio documents verification with the public key at `https://istio.io/misc/istio-key.pub`, and the keyless commands failed against the referenced Istio images. Updated manual and CI examples to use `cosign verify --key`.
- The post claimed users could verify an Istio SBOM attestation for `docker.io/istio/pilot:1.20.3`; `cosign verify-attestation` found no matching attestation. Removed the non-working SBOM verification command and changed the checklist item to "when available."
- The Kyverno policy used the deprecated ClusterPolicy verifyImages style and keyless attestors that do not match Istio's published signatures. Replaced it with a current `ImageValidatingPolicy` using Istio's public Cosign key.
- The Connaisseur values snippet was missing the required `application:` root and used a placeholder key. Updated it to match Connaisseur's documented values structure and included the Istio public key.
- The Gatekeeper section implied signature verification, but Gatekeeper does not verify Cosign signatures by itself. Updated the text and Rego example to enforce official-registry usage only, and added the matching constraint object.
- The custom-image admission-policy snippet used the old Kyverno `verifyImages` shape. Updated it to match the corrected Kyverno attestor format.
- The Helm chart verification section used `helm pull --prov` and `helm verify`, but the Istio `istiod` 1.20.3 chart does not publish a `.prov` file. Replaced that with a digest check against the official Istio chart repository index.

## Review Notes
- I verified `docker.io/istio/pilot:1.20.3`, `docker.io/istio/proxyv2:1.20.3`, and `docker.io/istio/install-cni:1.20.3` with Cosign v3.0.6 and Istio's public key.
- Local `cosign`, `helm`, and `kubectl` were not preinstalled, so I downloaded Cosign to `/tmp/cosign` for command verification and used official documentation for Helm and Kubernetes admission-controller syntax.
