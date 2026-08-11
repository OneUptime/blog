# How to Roll Out Image-Signature Enforcement in Kubernetes Without Blocking System and Sidecar Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Image Signing, Kyverno, Admission Control, Supply Chain Security

Description: Stage digest and signature policy from inventory through audit and canary enforcement while handling platform, init, ephemeral, and injected sidecar images explicitly.

---

Cluster-wide signature enforcement often fails on its first day because the policy sees more images than the application team expected. DNS, storage, CNI, observability agents, init containers, ephemeral debug containers, and service-mesh sidecars all become admission subjects. Some are injected after users submit a workload.

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

## Inventory the final image set

Query running Pods across all namespaces and normalize image IDs and declared references:

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

Also inspect `status.*ContainerStatuses[].imageID` to learn the resolved runtime digests. Declared tags and runtime digests answer different questions; store both during discovery.

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

Kyverno policies can record failures without denying admission. Begin with the policy violation action in Audit, while keeping error behavior deliberate. Current Kyverno reports distinguish `pass`, `skip`, `warn`, `error`, and `fail` results.

During the observation window:

- exercise deployments, rollbacks, Jobs, CronJobs, autoscaling, node replacement, and debug workflows;
- restart system components so dormant images are evaluated;
- test private registry credentials and custom CAs from controller Pods;
- mirror signatures, attestations, and SBOMs into every deployment registry;
- group failures by repository, namespace, controller, and reason;
- set a deadline and owner for every unresolved image.

Audit is a rollout state, not permanent enforcement. Publish coverage metrics and exit criteria.

## Enforce one controlled repository first

Match the internal repository rather than every image:

```yaml
matchImageReferences:
  - glob: "registry.example.com/apps/**"
```

For new Kyverno 1.18 deployments, use the stable `ImageValidatingPolicy` API and its current schema. Existing installations may still use legacy `ClusterPolicy.verifyImages`; Kyverno marks that type deprecated. Generate policy from the documentation matching the installed CRD.

Set digest mutation and verification deliberately. Pinning workload manifests to a digest before admission reduces registry lookups and makes GitOps diffs explicit.

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
- review bootstrap components that must run before the admission service is healthy.

Keep the policy engine's own images and dependencies in the bootstrap plan to avoid circular dependency. Kubernetes webhook guidance recommends preventing dependency loops and narrowing webhook scope.

## Design availability separately from compliance

A rule's Audit/Enforce action controls what happens when an image violates policy. A webhook `failurePolicy` controls what happens when the webhook errors or is unavailable. Treat these as separate risk choices.

High-assurance application namespaces may fail closed. Critical cluster recovery paths may need a preapproved, digest-scoped bootstrap mechanism. Do not set every verification error to Ignore simply to improve availability; that silently turns a registry outage into an unsigned-image bypass.

Improve reliability with multiple policy-controller replicas, Pod disruption budgets, resource requests, topology spread, registry availability, credential refresh, CA rotation tests, and latency monitoring.

## Create narrow, governed exceptions

Kyverno supports `PolicyException`, disabled by default and intended to be controlled with RBAC and policy. A safe exception names the exact policy/rule, namespace/workload, and immutable image digest. Add owner, ticket, justification, and expiry metadata, and enforce that metadata through GitOps review or another policy.

Do not allow wildcard exceptions from application namespaces. Alert before expiry, remove exceptions automatically through the approved controller/process, and report every use.

## Rollout and rollback checklist

- [ ] Inventory ordinary, init, ephemeral, and injected container images.
- [ ] Record owners, signer identities, signature repositories, and digests.
- [ ] Test mutation/injection ordering with the final admitted Pod.
- [ ] Start in Audit and define measurable exit criteria.
- [ ] Scope first enforcement to an internal controlled repository.
- [ ] Roll out namespace by namespace with representative restart tests.
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
