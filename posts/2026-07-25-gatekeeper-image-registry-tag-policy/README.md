# Restrict Image Registries and Tags Without Gatekeeper False Positives

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, Container Image, Supply Chain Security, Policy

Description: Combine approved registry, disallowed tag, and digest policies while handling image syntax, container variants, and rollout exceptions safely.

---

Container image policy is easy to write badly. Naive prefix matching can allow a malicious lookalike registry, while naive colon splitting mistakes a registry port for a tag.

The official Gatekeeper Library already includes policies for allowed images, disallowed tags, and required digests. Start with those reviewed templates and add focused tests for your naming rules.

## Use the newer allowed-images policy

`K8sAllowedReposv2` supports exact strings and one glob form: a trailing `*` for prefix matching.

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedReposv2
metadata:
  name: approved-container-images
spec:
  enforcementAction: dryrun
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - gatekeeper-system
  parameters:
    allowedImages:
      - registry.example.com/payments/*
      - registry.example.com/platform/base/*
      - registry.k8s.io/pause:3.10
```

Without `*`, the entry is an exact match. With a trailing `*`, it is a prefix.

Include the path boundary before the wildcard. This is safe:

```text
registry.example.com/payments/*
```

This is too broad:

```text
registry.example.com/payments*
```

The second form can match a repository path such as `payments-malicious/app`.

The older `K8sAllowedRepos` template uses prefix matching for every entry. Its documentation warns to include a trailing `/` to prevent bypass. Prefer v2 when exact and explicit prefix semantics fit the requirement.

## Decide how to handle implicit Docker Hub names

Kubernetes accepts image names such as:

```text
nginx:1.27
library/nginx:1.27
docker.io/library/nginx:1.27
```

They can refer to the same public registry convention, but Gatekeeper policy evaluates the string in the object. It does not necessarily normalize every shorthand into a fully qualified name.

Choose one approach:

- Require fully qualified image names and reject shorthand.
- Explicitly allow every accepted form.
- Mutate images to a canonical form, then validate the final value.

Requiring fully qualified names is usually clearest for supply-chain controls. Test registry hostnames with ports, nested repository paths, tags, digests, and tag-plus-digest forms.

## Block mutable or prohibited tags

The library's `K8sDisallowedTags` policy handles regular, init, and ephemeral containers. It also treats a plain image reference with neither a tag nor a digest as a violation and checks the last path component so a registry port is not mistaken for a tag.

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sDisallowedTags
metadata:
  name: disallow-mutable-image-tags
spec:
  enforcementAction: warn
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    tags:
      - latest
      - stable
    exemptImages: []
```

Use fully qualified entries for exemptions. A broad prefix exemption can allow an untrusted repository with a similar name.

The template checks disallowed tags with an end-of-string suffix match. A tag-plus-digest reference such as `api:latest@sha256:<digest>` therefore does not trigger its `latest` rule. The digest still pins the pulled content, but use a custom policy if the tag text itself must be prohibited in combined references.

Blocking `latest` does not make another tag immutable. A registry can move `v1.2.3` unless its governance prevents it.

## Require digests for immutability

The library's `K8sImageDigests` policy requires an image digest:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sImageDigests
metadata:
  name: container-images-use-digests
spec:
  enforcementAction: dryrun
  match:
    scope: Namespaced
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    exemptImages: []
```

An immutable reference looks like:

```text
registry.example.com/payments/api@sha256:<digest>
```

Kubernetes also accepts a tag and digest together. The digest determines the pulled content, while the tag remains human-readable:

```text
registry.example.com/payments/api:v2.4.1@sha256:<digest>
```

Registry allowlisting and digest enforcement solve different problems. A digest pins content but does not establish that the registry is trusted. Apply both controls where needed.

## Cover every path to a running container

Policy must inspect:

- `spec.containers`
- `spec.initContainers`
- `spec.ephemeralContainers`

The official library templates include these paths. A custom template that checks only `containers` leaves gaps.

A Pod-only Constraint does not reject the parent Deployment request unless workload expansion or parent-aware policy is configured. It can reject the controller-created Pod later, leaving a failed Deployment. Add expansion in `warn` first if immediate parent feedback is required.

## Avoid false positives during rollout

Inventory real image strings:

```bash
kubectl get pods -A -o go-template='{{range .items}}{{ $namespace := .metadata.namespace }}{{range .spec.initContainers}}{{printf "%s\t%s\n" $namespace .image}}{{end}}{{range .spec.containers}}{{printf "%s\t%s\n" $namespace .image}}{{end}}{{range .spec.ephemeralContainers}}{{printf "%s\t%s\n" $namespace .image}}{{end}}{{end}}' \
  | sort -u
```

Then:

1. Apply each Constraint as `dryrun`.
2. Group violations by registry, tag, and owning workload.
3. Fix build and deployment sources rather than live Pods.
4. Use narrow, time-bound exemptions for blockers.
5. Move to `warn`.
6. Promote namespace cohorts to `deny`.

Test malicious boundary cases:

```text
registry.example.com.evil.invalid/payments/api:v1
registry.example.com/payments-malicious/api:v1
registry.example.com:5000/payments/api:v1
registry.example.com/payments/api
registry.example.com/payments/api:latest
```

The first two must not pass merely because they share a string prefix.

## Official documentation

- [Gatekeeper Library allowed images](https://open-policy-agent.github.io/gatekeeper-library/website/validation/allowedreposv2/)
- [Gatekeeper Library disallowed tags](https://open-policy-agent.github.io/gatekeeper-library/website/validation/disallowedtags/)
- [Gatekeeper Library image digests](https://open-policy-agent.github.io/gatekeeper-library/website/validation/imagedigests/)
- [Kubernetes image names, tags, and digests](https://kubernetes.io/docs/concepts/containers/images/#image-names)

