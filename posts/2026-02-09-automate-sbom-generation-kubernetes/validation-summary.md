# Validation Summary: How to Automate SBOM Generation for All Container Images in a Kubernetes Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes CronJobs, RBAC, PVCs, and admission webhooks
- Syft SBOM generation
- Grype vulnerability scanning
- Cosign SBOM attestations and attestation verification
- GitHub Actions
- Docker
- Bash
- Python Flask
- CycloneDX and SPDX

## Sources Consulted
- Anchore Syft documentation: https://oss.anchore.com/docs/guides/sbom/formats/
- Anchore Syft README: https://github.com/anchore/syft
- Anchore Grype documentation: https://oss.anchore.com/docs/guides/vulnerability/scan-targets/
- Anchore Grype README: https://github.com/anchore/grype
- Sigstore Cosign attest command docs: https://github.com/sigstore/cosign/blob/main/doc/cosign_attest.md
- Sigstore Cosign verify-attestation command docs: https://github.com/sigstore/cosign/blob/main/doc/cosign_verify-attestation.md
- Sigstore Cosign deprecated SBOM attach/download docs: https://github.com/sigstore/cosign/blob/main/doc/cosign_attach_sbom.md and https://github.com/sigstore/cosign/blob/main/doc/cosign_download_sbom.md
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- GitHub Actions upload-artifact documentation: https://github.com/actions/upload-artifact
- SPDX overview: https://spdx.dev/about/overview/
- CycloneDX security use cases: https://cyclonedx.org/use-cases/security/

## Issues Found
- Syft examples used the older `syft packages` form and `--file`; changed examples to current `syft <source> -o format=file` syntax.
- The Dockerfile assumed `anchore/syft:latest` supported `apk`; changed it to an Alpine base that installs Syft, Grype, Bash, jq, curl, certificates, and kubectl.
- The Kubernetes CronJob tried to set `OUTPUT_DIR` to `/sboms/$(date +%Y-%m-%d)`, which Kubernetes would not execute as shell command substitution; moved dated directory creation into the script default.
- The CronJob mounted `/var/run/docker.sock`, which is unnecessary for Syft registry image scanning and often unavailable in Kubernetes clusters; removed the socket volume and mount.
- Image discovery only included regular containers; updated scripts and webhook logic to include init containers and ephemeral containers too.
- GitHub Actions used deprecated or outdated actions (`actions/checkout@v3`, `actions/upload-artifact@v3`); updated to v4.
- The CI workflow attached an SBOM before pushing the image and used deprecated raw Cosign SBOM attachment commands; changed it to push first and then create a Cosign SBOM attestation.
- The CI workflow did not log in to GHCR and used an incomplete GHCR image name; changed it to `ghcr.io/${{ github.repository }}:${{ github.sha }}` and added registry login.
- The webhook used deprecated `cosign download sbom`; changed it to `cosign verify-attestation --type cyclonedx`.
- The webhook deployment did not serve HTTPS even though Kubernetes admission webhooks require TLS; added a TLS secret mount and Flask `ssl_context`.
- The vulnerability scan script would try to scan a literal glob if no SBOM files existed; enabled Bash `nullglob`.
- The compliance report could divide by zero when no images were found; added a guard.
- The vulnerability scan CronJob used `anchore/grype:latest` with a Bash script, but that image is not guaranteed to include Bash and jq; changed it to the previously built utility image.

## Review Notes
- The webhook example uses broad default Cosign certificate identity and issuer regex values for demonstration. Production deployments should set restrictive expected identity and issuer values for the CI system that creates the attestations.
- The PVC uses `ReadWriteMany`, which requires a storage class that supports RWX access.
- The webhook image build is still left as an exercise; the image must include Flask and Cosign.
