# Validation Summary: How to Configure HelmRepository Pass Credentials in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- HelmRepository
- Helm repositories and OCI Helm repositories
- Kubernetes Secrets
- SOPS
- Sealed Secrets
- kubectl
- Flux CLI

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux `flux create source helm` CLI documentation: https://fluxcd.io/flux/cmd/flux_create_source_helm/
- Flux `flux reconcile source helm` CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_helm/
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes `kubectl create secret generic` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The post originally described `passCredentials` as if Flux only sends credentials for the index request by default and as if the option is generally required for authenticated chart downloads. Flux documents `spec.passCredentials` as forwarding credentials from `secretRef` to a host that does not match the HelmRepository URL. I updated the explanation to focus on chart URLs advertised on a different host.
- The post claimed that `passCredentials` works with all HelmRepository authentication methods and showed it with mutual TLS credentials. Flux documents `passCredentials` as applying to HTTP/S Helm repositories and forwarding credentials from `secretRef`; mutual TLS should be configured with `certSecretRef`. I removed the unnecessary `secretRef` and `passCredentials` fields from the TLS example.
- The OCI section said authentication is handled per registry by the container runtime. For Flux HelmRepository sources, Flux authenticates to OCI registries using configured registry credentials. I updated the wording and clarified that `passCredentials` only applies to HTTP/S Helm repositories.
- The post stated that Flux does not recognize `kubernetes.io/basic-auth` Secrets. Flux requires `username` and `password` keys for basic auth, and Kubernetes documents `kubernetes.io/basic-auth` as a valid built-in Secret type with those keys. I changed the pitfall to focus on required key names instead of disallowing the Secret type.

## Review Notes
The Flux, Kubernetes, and SOPS configuration examples are otherwise consistent with current official documentation. The local environment did not have `flux`, `kubectl`, or `sops` installed, so CLI syntax was verified against official command documentation rather than local `--help` output.
