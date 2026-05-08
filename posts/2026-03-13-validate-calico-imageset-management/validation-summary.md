# Validation Summary: How to Validate Calico ImageSet Management

## Status
validated

## Post Type
Tutorial / validation guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes custom resources
- ImageSet
- TigeraStatus
- kubectl JSONPath
- crane container registry CLI
- Bash

## Sources Consulted
- Calico documentation: Install images by registry digest, https://docs.tigera.io/calico/latest/operations/image-options/imageset
- Calico Installation API reference, including ImageSet and InstallationStatus fields, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Configure use of your image registry, https://docs.tigera.io/calico/latest/operations/image-options/alternate-registry
- Calico Enterprise TigeraStatus reference, https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Kubernetes documentation: JSONPath support, https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The introduction and prerequisites referred to network-level validation and node access, but the post did not include a network-level validation step. Updated the wording to match the validation levels actually covered: resource configuration, runtime images, registry digest integrity, and operator status.
- The resource validation section implied `status.imageSet` should be populated immediately. Tigera documents that Installation status is updated only after `kubectl get tigerastatus calico` reports Available True with Progressing and Degraded False, so the expected output note was corrected.
- The pod image validation script emitted the pod name only once before iterating containers, which would lose the pod name for additional containers in a pod. It also skipped init container images. Updated the JSONPath and loop to validate init containers and regular containers while preserving the pod name.
- The pod image registry comparison used a loose prefix match that could accept similarly named paths. Normalized the expected registry path and required a slash-delimited prefix.
- The digest script ended with "All digests verified" even though it validates only the listed Calico image names. Updated the success message to "All listed Calico image digests verified."
- The operator status expectation checked only Degraded. Updated it to also require Available True and Progressing False, matching Tigera's ImageSet verification guidance.
- The complete validation script used `grep -v Running` in a command substitution while `set -euo pipefail` was enabled. When all pods were Running, `grep` could return 1 and abort the script before the check. Replaced it with an `awk` count that returns successfully on the healthy path.

## Review Notes
The digest validation example still assumes the listed Calico images are mirrored under a single registry/image path and use the same Calico version tag. That is reasonable for the example, but real deployments should include every image the operator deploys for their selected Calico version and registry layout, including any Windows, operator, gateway, observability, or optional component images in use.
