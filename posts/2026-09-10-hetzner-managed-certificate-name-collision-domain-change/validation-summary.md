# Validation Summary: How to Diagnose Hetzner Certificate Name Collisions After Domain Changes

## Status

validated

## Post Type

Source-based certificate troubleshooting and recovery guide

## Technologies Covered

- Hetzner HCCM v1.36.0 certificate reconciliation
- Hetzner managed certificates, Service UID labels and DNS validation
- hcloud CLI, Kubernetes annotations and OpenSSL

## Sources Consulted

- [HCCM v1.36.0 managed-certificate reconciliation and explicit-reference path](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/internal/hcops/load_balancer.go)
- [HCCM v1.36.0 uniqueness-error mapping and single-result label lookup](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/internal/hcops/certificates.go)
- [HCCM v1.36.0 certificate annotations](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/docs/reference/load_balancer_annotations.md)
- [Hetzner certificate DNS and renewal requirements](https://docs.hetzner.com/networking/certificates/faq/)
- [hcloud certificate create](https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_certificate_create.md)
- [hcloud certificate describe](https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_certificate_describe.md)
- [OpenSSL s_client hostname and verification-error options](https://docs.openssl.org/3.5/man1/openssl-s_client/)
- [kubectl get output and resource syntax](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found

No technical issues found.

## Review Notes

- Read the creation and selection paths: the generated default name contains the Service UID, uniqueness errors map to ErrAlreadyExists, that result is accepted, and lookup by `hcloud-ccm/service-uid` requires exactly one certificate. The three collision scenarios follow from these source branches.
- Confirmed that selecting `certificate-type: uploaded` bypasses the managed-creation branch and resolves the `http-certificates` IDs/names without checking the actual cloud certificate type. The post explicitly describes this as a pinned-release implementation detail and preserves Hetzner renewal ownership.
- Verified repeated `--domain` flags, managed certificate creation syntax, annotation keys, and OpenSSL `-servername`, `-verify_hostname`, and `-verify_return_error`. The external-DNS ACME delegation option is documented in Hetzner’s FAQ.
- No production transition was executed. The article appropriately requires canary verification and inventory of all remaining references before deleting old certificates; a similarly named resource does not establish ownership.
- Reviewed on 2026-09-10. All 4 shell examples passed `bash -n`; all 1 YAML examples parsed with PyYAML. These are syntax checks plus documentation/source review, not execution against a live Kubernetes cluster or cloud account. Cloud resource state, permissions, API actions, traffic, DNS propagation and certificate issuance were not runtime-verified.
