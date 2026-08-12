# Roll Out Kubernetes Image-Signature Enforcement Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Image Signing, Kyverno, Admission Control, Supply Chain Security

Description: Stage digest and signature policy from inventory through audit and canary enforcement while handling platform, init, ephemeral, and injected sidecar images explicitly.

---

Cluster-wide signature enforcement often fails on its first day because the policy sees more images than the application team expected. DNS, storage, CNI, observability agents, init containers, ephemeral debug containers, and service-mesh sidecars can all become admission subjects when the corresponding API requests and subresources are matched. Some are injected after users submit a workload.

A safe rollout inventories the final Pod image set, signs or explicitly trusts every required producer, begins in audit, and expands enforcement by repository and namespace. A blanket `*` rule with ad hoc exclusions is difficult to reason about and easy to bypass.

## Define what the gate protects

Write the initial trust statement narrowly:

> Pods in application namespaces may use images from `registry.example.com/apps/*` only when a protected release workflow signed the immutable digest.

This scopes the first policy to images the organization controls. It does not claim to validate every kube-system or vendor image. Add separate policies for external producers after recording their official verification identities or public keys.

Also decide whether the policy verifies:

- OCI index digests or platform child manifests;
- ordinary containers, init containers, and ephemeral containers;
- images added by sidecar injection;
- Pods only or custom workload resources;
- signatures only or also provenance/SBOM/scan attestations.

Ambiguity here becomes an outage later.

Ephemeral containers are added later through the `pods/ephemeralcontainers` subresource, so a policy that covers debug images must match `UPDATE` requests to that subresource; matching `pods` alone does not include subresources.

## Inventory the final image set

Query existing Pods across all namespaces and list their declared container image references:

```bash
kubectl get pods -A -o json \
  | jq -r '
      .items[] as $pod
      | (($pod.spec.initContainers // [])
         + ($pod.spec.containers // [])
         + ($pod.spec.ephemeralContainers // []))[]
      | [$pod.metadata.namespace, $pod.metadata.name, .name, .image]
      | @tsv' \
  | sort -u
```

Also inspect `status.containerStatuses[].imageID`, `status.initContainerStatuses[].imageID`, and `status.ephemeralContainerStatuses[].imageID` to collect runtime-reported image identifiers where available. These identifiers are resolved by the runtime but are not guaranteed to be registry digests. Declared references and runtime-reported identifiers answer different questions; store both during discovery.

Create an ownership table for every registry/repository:

| Image source | Owner | Signing identity/key | Signature location | Policy action |
| --- | --- | --- | --- | --- |
| internal apps | release platform | exact workflow identity | same repository | enforce |
| service mesh | platform team/vendor | documented vendor identity | vendor repository | separate policy |
| cluster add-ons | cluster ops | vendor or mirrored signature | recorded | staged |
| unknown | none | none | none | remove or quarantine |

This is more useful than an ever-growing list of unexplained exclusions.

## Resolve injection and mutation order

Mutating admission webhooks can add sidecars or rewrite registries. Kubernetes may reinvoke qualifying mutating webhooks, and ordering between separate webhooks should not be treated as a fixed business contract.

Test the complete chain:

1. submit the same workload to a canary namespace;
2. inspect the admitted Pod, not only the Deployment template;
3. record injected image repositories and digests;
4. confirm the verification engine evaluates the final images;
5. repeat when upgrading the mesh, injector, or policy engine.

If the injector's image is unsigned, the sustainable choices are to use a vendor-signed release, mirror and sign the approved digest under a controlled process, or add a narrowly scoped vendor trust policy. Exempting every image with `sidecar` in its name is not a trust boundary.

## Start with audit and reports

Kyverno policies can record failures without denying admission. For an `ImageValidatingPolicy`, begin with `validationActions: [Audit]`; for a legacy `verifyImages` rule, use `failureAction: Audit`. Keep error behavior deliberate. Current Kyverno reports distinguish `pass`, `skip`, `warn`, `error`, and `fail` results.

During the observation window:

- exercise deployments, rollbacks, Jobs, CronJobs, autoscaling, node replacement, and debug workflows;
- recreate API-managed system Pods so dormant image references pass through admission; a kubelet restart of a container within the same Pod does not re-admit the Pod spec or re-run image admission checks;
- test private registry credentials and custom CAs from controller Pods;
- make signatures, attestations, and SBOM artifacts reachable from every deployment environment by mirroring them with the images or configuring supported alternate signature and attestation sources;
- group failures by repository, namespace, controller, and reason;
- set a deadline and owner for every unresolved image.

Audit is a rollout state, not permanent enforcement. Publish coverage metrics and exit criteria.

## Enforce one controlled repository first

Match the internal repository rather than every image:

```yaml
matchImageReferences:
  - glob: "registry.example.com/apps/**"
```

Kyverno 1.17 promoted `ImageValidatingPolicy` to the stable `policies.kyverno.io/v1` API. At publication, 1.18.2 is the latest stable release, but it does not include upstream fixes for known gaps in ephemeral-container enforcement or the `mutateDigest`, `verifyDigest`, and `required` validation settings. Do not rely on those paths until you run a release containing the fixes, and test them against the exact installed version. Existing installations may still use legacy `ClusterPolicy` resources with `verifyImages` rules; Kyverno marked `ClusterPolicy` deprecated in 1.17, and it receives critical fixes only in 1.18. Kyverno 1.18 users retaining legacy rules should run at least 1.18.2, which fixes a multi-container early-return bug in required verification. Generate policy from the documentation matching the installed CRD.

Set digest mutation and verification deliberately. Pinning workload manifests to a digest before admission avoids tag-to-digest resolution and makes GitOps diffs explicit, but signature and attestation verification still queries the registry.

Roll enforcement through:

1. a dedicated test namespace;
2. one low-risk application namespace;
3. all namespaces owned by one team;
4. remaining application namespaces;
5. platform and system repositories under their own trust policies.

## Handle system images with explicit boundaries

Avoid a permanent blanket exemption for `kube-system`. Anyone who can create a privileged workload there would bypass image trust. Instead:

- restrict write access to system namespaces with RBAC;
- enumerate approved platform repositories;
- verify vendor signatures using values from vendor documentation;
- mirror and sign approved external digests if the vendor provides no compatible signature;
- match the exact ServiceAccounts, namespaces, and repositories needed for bootstrap;
- audit Kyverno's installation-level webhook namespace selectors, `resourceFilters`, and excluded identities before relying on a system-workload policy;
- review bootstrap components that must run before the admission service is healthy.

Keep the policy engine's own images and dependencies in the bootstrap plan to avoid circular dependency. Kubernetes webhook guidance recommends preventing dependency loops and narrowing webhook scope.

Inventory and govern static Pods separately at the node/bootstrap layer: the kubelet runs them outside API-server management, and rejecting their mirror Pods during admission does not stop the static Pods on the node.

## Design availability separately from compliance

For `ImageValidatingPolicy`, `validationActions` controls validation failures: `Audit` records them and `Deny` blocks them. Its `failurePolicy` controls policy-evaluation failures and is reflected in the generated webhook's `Fail`/`Ignore` behavior. The webhook setting also governs call failures and timeouts; it does not override an explicit denial response. Legacy `verifyImages` rules use `failureAction: Audit` or `Enforce`. Treat these as separate risk choices.

High-assurance application namespaces may fail closed. Critical cluster recovery paths may need a preapproved, digest-scoped bootstrap mechanism. Do not use `failurePolicy: Ignore` broadly simply for availability; it allows requests when the webhook call fails or times out. Test fast registry error responses and registry-induced webhook timeouts separately.

Improve reliability with multiple admission-controller replicas, Pod disruption budgets, resource requests, topology spread, registry availability, credential refresh, CA rotation tests, and latency monitoring.

## Create narrow, governed exceptions

Kyverno supports `PolicyException`, disabled by default and intended to be controlled with RBAC and policy. For `ImageValidatingPolicy`, a safe exception references the exact policy name and kind with `policyRefs` and uses narrowly scoped `matchConditions`; a match skips the referenced policy for the whole resource, not just one image. For a legacy `ClusterPolicy`, it identifies the exact `policyName` and `ruleNames`. The exception's own namespace does not constrain its target resources, so constrain either form to the intended namespace/workload. For an image-policy exception, require the complete image set covered by the skipped policy to consist only of approved immutable digests. Add owner, ticket, justification, and expiry metadata, and enforce that metadata through GitOps review or another policy.

Do not allow wildcard exceptions from application namespaces. Alert before expiry, remove exceptions automatically through the approved controller/process, and report every use.

## Rollout and rollback checklist

- [ ] Inventory ordinary, init, ephemeral, and injected container images.
- [ ] Record owners, signer identities, signature repositories, and digests.
- [ ] Test mutation/injection ordering with the final admitted Pod.
- [ ] Start in Audit and define measurable exit criteria.
- [ ] Scope first enforcement to an internal controlled repository.
- [ ] Roll out namespace by namespace with representative recreation and rollout tests.
- [ ] Give system and vendor images separate explicit trust policies.
- [ ] Protect exceptions with RBAC, review, exact digests, and expiry.
- [ ] Make policy-service and registry availability observable.
- [ ] Prepare a versioned rollback policy that narrows enforcement without deleting audit visibility.

## Official Documentation

- [Kyverno ImageValidatingPolicy](https://kyverno.io/docs/policy-types/image-validating-policy/)
- [Kyverno policy reports](https://kyverno.io/docs/guides/reports/)
- [Kyverno policy exceptions](https://kyverno.io/docs/guides/exceptions/)
- [Kyverno policy-type status](https://kyverno.io/docs/policy-types/overview/)
- [Kubernetes admission webhook good practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kubernetes container image documentation](https://kubernetes.io/docs/concepts/containers/images/)

## Conclusion

Reliable signature enforcement is an inventory and rollout program, not a single wildcard policy. Start with images you control, observe every final Pod mutation, add explicit trust for system and sidecar producers, and expand enforcement through canary namespaces. Narrow exceptions and deliberate availability design keep the cluster operable without turning operational pressure into a permanent bypass.
