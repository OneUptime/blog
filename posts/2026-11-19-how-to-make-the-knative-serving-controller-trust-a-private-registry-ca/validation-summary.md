# Validation Summary: How to Make the Knative Serving Controller Trust a Private Registry CA

## Status
validated

## Post Type
Technical configuration and troubleshooting guide.

## Technologies Covered
- Knative Serving and Knative Operator
- Kubernetes Deployments, ConfigMaps, Secrets, service accounts, and kubectl
- Private container registries and image tag-to-digest resolution
- TLS, certificate authorities, and OpenSSL
- Go certificate trust configuration

## Sources Consulted
- [Knative tag resolution](https://knative.dev/docs/serving/tag-resolution/) — controller registry access and custom certificate environment variables.
- [Knative Operator controller certificates](https://knative.dev/docs/install/operator/configuring-serving-cr/#ssl-certificate-for-controller) — supported custom certificate fields and source types.
- [Knative private registries](https://knative.dev/docs/serving/deploying-from-private-registry/) — Service and service account image-pull credentials.
- [Knative Service CRD](https://raw.githubusercontent.com/knative/serving/main/config/core/300-resources/service.yaml) — Service resource definition.
- [kubectl create configmap](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/) — file-to-key mapping, client dry-run, and YAML output.
- [kubectl describe](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/) and [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — resource inspection syntax.
- [kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) — Deployment targets and relative time filtering.
- [Kubernetes ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/) — named ConfigMap volumes and read-only mounts.
- [Kubernetes images](https://kubernetes.io/docs/concepts/containers/images/) — runtime image pulling and ImagePullBackOff.
- [Go crypto/x509](https://pkg.go.dev/crypto/x509#SystemCertPool) — certificate path overrides and system trust behavior.
- [OpenSSL s_client](https://docs.openssl.org/3.6/man1/openssl-s_client/) — connection, SNI, CA file, hostname verification, and verification-error flags.
- [Author profile](https://github.com/nawazdhandala) — checked the linked author URL and its redirect.

## Issues Found
No technical issues found.

## Review Notes
- The controller and node runtime are separate registry clients. The post correctly separates tag-resolution trust, registry credentials, and node image-pull failures.
- The Operator field `spec.controller-custom-certs` and its `name` and `type` properties match the documented configuration; both ConfigMap and Secret sources are supported.
- The ConfigMap command correctly generates a manifest without creating the object. The following instruction explicitly requires applying it. The YAML-managed example relies on that same ConfigMap having been created in the controller namespace.
- The Deployment fragment correctly associates the ConfigMap volume with the controller mount and SSL_CERT_DIR. It is explicitly identified as a fragment, with instructions to preserve the existing Deployment configuration.
- The shell commands and YAML snippets were reviewed against official references. The OpenSSL command enables certificate verification, hostname verification, and failure on verification errors; SNI is configured separately.
- The distinction between a diagnostic TLS check and actual controller trust is correct. The post also requires a fresh lookup after CA rotation, avoiding misleading results from skipped resolution or cached images.
- No fixed software version is claimed. Installed Operator CRD compatibility and controller image trust behavior remain environment-specific, as the post already notes. No deprecated API or option was identified in the examples.
- In a controller deployment with multiple replicas, the shown logs command may select only one pod; checking all relevant replicas can improve troubleshooting. This does not invalidate the example.
- Review was documentation-based. No live Kubernetes cluster, private registry, or CA certificate was supplied, so end-to-end deployment and TLS connectivity were not executed.
- README.md was left unchanged because no technical correction was necessary.
