# Validation Summary

## Source and local checks

Reviewed the repository conventions, OneUptime agent documentation and chart 17.0.0, plus Red Hat OpenShift 4.20 SCC and image-pull guidance. Chart archive checksum matched the official index: fc2dcbb2117a422fd9eedcb1127d0dbd9eaaf25f48ddd403e39e10f0be435858.

Rendered the exact article values with Helm 3.12.3 and parsed the output with Ruby Psych. Verified two Deployments and one DaemonSet with exactly two unique internal images. Asserted no SCC objects, hostPath volumes, privileged containers, host PID/network access, or fixed runAsUser. Containers drop ALL capabilities and disallow privilege escalation. Confirmed the existing ingestion Secret reference, API log mode, namespace log filter, and absent optional AI/cost/eBPF/profiling workloads.

Reviewed node-collector source and rendered configuration: kubelet/cAdvisor certificate verification is skipped by this chart version. The article explicitly identifies this as a separate production security review item, does not provide an invented values toggle, and does not claim the restricted preset satisfies transport-security policy. Private-CA export trust for both runtime families is also stated as a prerequisite.

All four Bash blocks passed syntax checking. YAML matched the rendered values exactly. Mermaid structural checks passed for seven declared nodes and seven edges; no renderer was run. Generated the social image using the repository npm script and visually checked its readable title, branding, margins, and lack of clipping.

## Limitations

No OpenShift cluster or SCC admission test, image pull, private registry transfer, API stream, Collector runtime validation, or telemetry delivery test was run. Published image versions are source-verified, not registry-manifest verified. Actual UID assignment and SCC selection require cluster testing. The example is a source-reviewed baseline with a clearly disclosed kubelet TLS limitation, not a claim of production security certification. No production cluster state or credentials were changed.

## Checked official sources

- [SCC documentation](https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/authentication_and_authorization/managing-pod-security-policies)
- [agent's OpenShift reference](https://oneuptime.com/docs/en/telemetry/kubernetes-agent#openshift)
- [pinned chart source](https://github.com/OneUptime/oneuptime/blob/0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e/HelmChart/Public/kubernetes-agent/values.yaml)
- [image pull-secret association](https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/images/managing-images)
- [node-collector template](https://github.com/OneUptime/oneuptime/blob/0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e/HelmChart/Public/kubernetes-agent/templates/configmap-daemonset.yaml)

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
