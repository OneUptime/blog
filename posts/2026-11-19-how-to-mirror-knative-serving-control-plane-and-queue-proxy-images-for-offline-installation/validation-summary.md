# Validation Summary: Mirror Knative Serving Control Plane and Queue Proxy Images for Offline Installs

## Status
validated

## Post Type
Technical guide with Python, Bash, Kubernetes CLI, and Knative Operator configuration examples.

## Technologies Covered
- Knative Serving, Knative Operator, and queue-proxy
- Kubernetes Pods, Revisions, image pull Secrets, and kubectl JSONPath
- Container registries, image digests, and multi-architecture images
- Skopeo image copying
- Python 3, pathlib, and PyYAML
- Bash and ko manifest resolution

## Sources Consulted
- [Knative installation overview](https://knative.dev/docs/install/) — installation paths and supporting components.
- [Install using the Knative Operator](https://knative.dev/docs/install/operator/knative-with-operators/) — Operator installation and prerequisites.
- [Configure Knative Serving CRDs](https://knative.dev/docs/install/operator/configuring-serving-cr/) — registry templates, overrides, pull Secrets, configuration maps, and controller certificates.
- [Configure Deployment resources](https://knative.dev/docs/serving/configuration/deployment/) — config-deployment and queue-sidecar-image.
- [Deploying from private registries](https://knative.dev/docs/serving/deploying-from-private-registry/) — application image pull credentials.
- [Knative tag resolution](https://knative.dev/docs/serving/tag-resolution/) — controller registry access and custom CA trust.
- [Skopeo copy manual](https://github.com/podman-container-tools/skopeo/blob/main/docs/skopeo-copy.1.md) — copy syntax, --all, and --preserve-digests. The article's containers/skopeo link redirects to this official repository.
- [Kubernetes images](https://kubernetes.io/docs/concepts/containers/images/) — image caching, pull failures, digests, and namespace-scoped Secrets.
- [kubectl JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/) — list iteration, field selection, and newline literals.
- [PyYAML documentation](https://pyyaml.org/wiki/PyYAMLDocumentation) — safe_load_all and standard YAML types.
- [Python pathlib documentation](https://docs.python.org/3/library/pathlib.html#pathlib.Path.read_text) — reading manifest text.
- [ko Kubernetes integration](https://ko.build/features/k8s/) — replacement of ko:// build references with image references.
- Local Bash builtin documentation, obtained with `bash -c 'help read'` — IFS splitting and read -r behavior.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. Its image inventory limitations and requirement to use exact release inputs are appropriate.
- The Operator snippet is correctly presented as a fragment to merge into an existing KnativeServing resource. The registry template, pull Secret objects, and explicit queue-sidecar-image configuration agree with the official documentation.
- Python syntax parsing and Bash syntax checks passed for the supplied code blocks. PyYAML is not installed in the review environment, so the helper was reviewed against its documentation but was not executed with YAML input; the YAML snippet was inspected manually.
- The kubectl expression selects Pod names and both init-container and regular-container images. The referenced namespace and Service must exist in the reader's test cluster.
- For multi-architecture copying, a digest-pinned source must identify the image index or manifest list when all its architectures are required. --all cannot discover sibling architectures from a source pinned only to a single-platform manifest.
- The TSV loop assumes valid, newline-terminated, two-column input, as is conventional for a reviewed TSV file. Mirror names and tags are illustrative and must match the actual mirrored artifacts.
- Pull credentials must be attached to the relevant Pod template or ServiceAccount, not merely created in the namespace. The post correctly distinguishes application credentials from control-plane credentials.
- No exact Knative release is claimed. Readers must check their chosen release manifests and Operator compatibility, as the post instructs. No deprecated API or flag was identified in the examples.
- No registry transfer, Kubernetes installation, or disconnected acceptance test was performed. Those require the reader's registries, credentials, nodes, and egress controls; this validation establishes documentation consistency and local syntax correctness, not a live deployment result.
