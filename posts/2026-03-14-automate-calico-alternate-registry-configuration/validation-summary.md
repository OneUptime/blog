# Validation Summary: Automating Calico Alternate Registry Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Tigera operator
- Kubernetes
- Helm
- container registries and image pull secrets
- crane / go-containerregistry
- GitHub Actions

## Sources Consulted
- Calico Open Source documentation, Configure use of your image registry: https://docs.tigera.io/calico/latest/operations/image-options/alternate-registry
- Calico Open Source Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Open Source Helm installation reference: https://docs.tigera.io/calico/latest/reference/installation/helm_customization
- Calico v3.27.0 Tigera operator Helm chart values: https://github.com/projectcalico/calico/blob/v3.27.0/charts/tigera-operator/values.yaml
- Calico v3.27.0 Tigera operator Helm chart templates: https://github.com/projectcalico/calico/tree/v3.27.0/charts/tigera-operator/templates
- Kubernetes kubectl create secret docker-registry reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes private registry image pull documentation: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- go-containerregistry / crane documentation: https://pkg.go.dev/github.com/google/go-containerregistry/cmd/crane

## Issues Found
- The Installation and Helm examples used `registry: registry.example.com` without the trailing slash. The Calico Installation API documents `spec.registry` as the registry prefix and says specified values must end with `/`, so I changed these examples to `registry.example.com/`.
- The Helm values example placed `imagePullSecrets` at the chart top level as a list. In the v3.27 Tigera operator chart, top-level `imagePullSecrets` is a map for secret content, while existing pull secrets belong under `installation.imagePullSecrets`. I moved the example to `installation.imagePullSecrets`.
- The pull secret was created in `calico-system`, but Calico's alternate-registry instructions and the v3.27 chart comments require existing installation pull secrets in the `tigera-operator` namespace. I changed the command to create the namespace first and create the secret in `tigera-operator`.
- The mirror script omitted images commonly deployed by operator-managed Calico v3.27 installations, notably the Tigera operator, `apiserver`, and `key-cert-provisioner`, and used Docker Hub for component images where current Calico alternate-registry documentation uses Quay. I updated the list to mirror the v3.27 operator-managed component set from Quay, while leaving `calico/ctl` on Docker Hub as reflected by the v3.27 chart values.
- The Helm example configured the Installation registry but not the Tigera operator deployment image. In an air-gapped install, the operator pod also needs to come from the private registry, so I added the matching `tigeraOperator` image override for the mirrored operator image.

## Review Notes
- `kubectl` was not installed in the local environment, so kubectl command validation was done against the official generated Kubernetes reference instead of local `--help` output.
- The post still assumes a Linux-only Calico deployment. Hybrid Linux/Windows clusters require mirroring the Windows images documented by Calico separately.
