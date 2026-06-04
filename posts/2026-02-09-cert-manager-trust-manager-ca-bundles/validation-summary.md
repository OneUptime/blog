# Validation Summary: How to Use cert-manager Trust Manager to Distribute CA Bundles Across Namespaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- cert-manager trust-manager
- Kubernetes Custom Resources
- ConfigMaps and Secrets
- TLS CA bundles
- Helm

## Sources Consulted
- cert-manager trust-manager documentation: https://cert-manager.io/docs/trust/trust-manager/
- cert-manager trust-manager installation documentation: https://cert-manager.io/docs/trust/trust-manager/installation/
- cert-manager trust-manager API reference: https://cert-manager.io/docs/trust/trust-manager/api-reference/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes volumes documentation for ConfigMap and subPath behavior: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- GitHub release URL check for the old install manifest: https://github.com/cert-manager/trust-manager/releases/download/v0.7.0/trust-manager.yaml

## Issues Found
- The installation command referenced a `v0.7.0` GitHub manifest URL that now returns 404. Replaced it with the official OCI Helm chart installation command from the current trust-manager docs.
- The post implied Secret and ConfigMap sources could be namespace-local. Updated descriptions and comments to state that trust-manager reads those sources from the configured trust namespace by default.
- The post described the target as having a ConfigMap name and key. Updated this to explain that target resources are named after the Bundle, while the target ConfigMap field configures the data key.
- The application example mounted the ConfigMap key using `subPath`, which prevents automatic ConfigMap volume updates from reaching the container. Changed the example to mount the ConfigMap as a directory and updated the environment variables and troubleshooting path.
- The "Filtering Certificates in Bundles" section claimed trust-manager filters certificates based on validity and format, but the snippet actually demonstrated `additionalFormats`. Renamed and corrected the section to describe additional trust store output formats.
- The additional format example and best practice recommended JKS for Java. Updated the example and wording to use PKCS#12, while keeping the supported `additionalFormats` API shape.
- The Bundle status description listed namespace counts and last sync time, which are not status fields in the API reference. Replaced this with conditions, observed generation, and default CA package version.
- The conflict section suggested multiple Bundles could target the same ConfigMap name. Updated the wording to reflect that target resources are named after the Bundle.
- The troubleshooting command for checking source Secrets omitted the trust namespace. Added `-n cert-manager` to match the install and examples.

## Review Notes
- `kubectl` and `helm` were not installed in the local environment, so CLI command behavior was validated against official documentation and URL checks rather than local `--help` output.
- The examples assume the trust namespace is `cert-manager`, which matches the official default and the installation command in this post. Clusters using a custom `app.trust.namespace` value must create source Secrets and ConfigMaps in that namespace instead.
