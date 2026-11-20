# Rewrite Images to a Private Registry Without Breaking Pulls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DevOps

Description: Map image repositories without losing pinned digests, verify mirrored content, and keep registry credentials and node CA trust aligned.

Changing an image from a public registry to an internal registry changes more than a hostname. The repository path may differ, the destination may not contain the requested manifest, and the node may lack credentials or certificate trust for the new endpoint.

A webhook can produce perfectly valid JSON and still leave every new Pod in an image-pull failure. Treat the rewrite as the final step of a prepared distribution path: copy approved content, verify its destination reference, provision access, and only then rewrite incoming workloads.

## Define the repository mapping explicitly

Avoid replacing a hostname substring inside arbitrary image text. Container references can contain registry ports, repository paths, tags, and digests. A tag-plus-digest reference also needs deliberate handling: Kubernetes [uses the digest to select the content](https://kubernetes.io/docs/concepts/containers/images/#image-names).

A mapping should identify complete repositories:

| Source repository | Destination repository |
|---|---|
| `source.example.org/team/api` | `mirror.example.internal/upstream/team/api` |
| `source.example.org:5443/team/api` | `mirror.example.internal/partner/team/api` |

These are examples, not registries to contact. Keeping separate destination paths avoids accidentally merging unrelated upstream repositories. Include any registry port in the mapping key.

For the simplest contract, accept already-pinned SHA-256 references. Resolve mutable tags during release preparation. Otherwise, decide how a tag at the destination is kept aligned with the approved source; copying two independently moving tags does not create an immutable release.

## Copy the pinned content before rewriting

This example uses **crane v0.20.3**. Its [copy command](https://github.com/google/go-containerregistry/blob/v0.20.3/cmd/crane/doc/crane_copy.md) copies remote content while retaining the digest. The tagged [implementation](https://github.com/google/go-containerregistry/blob/v0.20.3/pkg/crane/copy.go) copies an image index when no platform is selected; an explicit platform selection instead copies the matching image.

Run these commands in your controlled mirroring environment. You need read access to the source, write access to the destination, and trusted CA chains for both registries. Replace the source reference with a real approved digest. The example writes to the destination registry, so select a repository intended for this import.

```bash
set -eu
source_ref='source.example.org/team/api@sha256:REPLACE_WITH_64_HEX_DIGEST'
digest="$(crane digest "$source_ref")"
destination_ref="mirror.example.internal/upstream/team/api@$digest"
crane copy "$source_ref" "$destination_ref"
test "$(crane digest "$destination_ref")" = "$digest"
printf '%s\n' "$destination_ref" > mirrored-image.lock
```

The equality check verifies the destination manifest or index digest. It does not prove node access, signatures, approval status, or application compatibility. Keep signature and related-artifact distribution in your supply-chain process rather than assuming every associated artifact follows an image copy automatically.

For multi-platform workloads, retain the index and its required children. Do not introduce `--platform linux/amd64` merely because the mirroring machine runs AMD64; that changes what gets copied. Test availability for every platform your scheduling rules allow.

## Parse and rewrite without resolving over the network

The following complete Go package uses `github.com/google/go-containerregistry v0.20.3` and was checked with Go 1.25.0. Its [digest parser](https://github.com/google/go-containerregistry/blob/v0.20.3/pkg/name/digest.go) handles repository context separately from the digest, including a tag supplied before `@`.

```go
package rewrite

import (
    "fmt"
    "github.com/google/go-containerregistry/pkg/name"
)

var repositories = map[string]string{
    "source.example.org/team/api":
        "mirror.example.internal/upstream/team/api",
    "source.example.org:5443/team/api":
        "mirror.example.internal/partner/team/api",
}

func RewritePinned(image string) (string, error) {
    source, err := name.NewDigest(image, name.StrictValidation)
    if err != nil {
        return "", fmt.Errorf("expected a fully qualified SHA-256 image: %w", err)
    }
    repository := source.Context().Name()
    for _, destination := range repositories {
        if repository == destination {
            return source.Name(), nil
        }
    }
    destination, ok := repositories[repository]
    if !ok {
        return "", fmt.Errorf("no mirror mapping for %q", repository)
    }
    target, err := name.NewRepository(destination, name.StrictValidation)
    if err != nil {
        return "", err
    }
    return target.Digest(source.DigestStr()).Name(), nil
}
```

The output keeps the digest and replaces only the approved repository context. A redundant tag is omitted from the canonical result. An already-mapped destination remains unchanged on subsequent calls. Unknown sources, malformed digests, and tag-only references fail instead of being guessed.

This helper does not verify that a digest was approved or copied. It is a naming transformation, not an authorization or provenance check. Publish mappings only after your mirroring checks succeed. The helper makes no registry call, so an admission request does not wait for an image import.

In the handler, apply changes to individual image fields and preserve unrelated container configuration. Include regular containers, init containers, and whichever subresource operations your stated policy covers. Keep JSON Patch generation and AdmissionReview response handling separate from this pure reference function.

## Align pull credentials with the destination

Source-registry credentials do not automatically authenticate to the mirror. Kubernetes [imagePullSecrets](https://kubernetes.io/docs/concepts/containers/images/#specifying-imagepullsecrets-on-a-pod) refer to Secrets in the Pod's namespace. Provision destination credentials through your existing secret-management process before switching image references.

A Pod may still need its original pull secrets for other containers. If an injector adds a destination pull-secret reference, append it only when absent; do not replace the entire list. Likewise, do not copy Secret data into annotations or inject the mirroring pipeline's write credential into application namespaces. Nodes generally need pull access, not permission to publish images.

This Pod fragment illustrates the intended references. Merge it into the reviewed Pod specification; it is not a complete workload:

```yaml
spec:
  imagePullSecrets:
    - name: existing-pull
    - name: mirror-pull
  containers:
    - name: app
      image: mirror.example.internal/upstream/team/api@sha256:REPLACE_WITH_64_HEX_DIGEST
```

With an authorized staging context selected, check the destination Secret's type without displaying its contents:

```bash
kubectl get secret mirror-pull -n payments -o jsonpath='{.type}{"\n"}'
```

Replace `payments` with the workload namespace. For a Docker configuration JSON Secret, expect `kubernetes.io/dockerconfigjson`. A matching type is only a structural check: it does not establish valid credentials, the correct registry entry, or repository permissions. The [private-registry tutorial](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/) explains those Secret and Pod relationships.

## Check node trust independently

The image is pulled by the node's container runtime. Trusting the mirror's internal CA inside the application container or webhook process does not configure that runtime. Follow the runtime's supported registry configuration, such as containerd's [registry-host configuration](https://github.com/containerd/containerd/blob/v1.7.27/docs/hosts.md), for the version your nodes use.

Keep TLS hostname validation enabled. Ensure the mirror certificate covers the hostname actually written into image references. Registry credentials and certificate trust solve different failures; neither substitutes for the other.

## Prove the complete path on a clean node

First test the pure function with ports, tag-plus-digest inputs, malformed hashes, unmapped repositories, and repeated application. Then verify copied content at the destination. The local checks for this article cover those parser cases and a temporary TLS-registry copy; they do not establish real node credentials.

Finally, run an approved staging workload on a node that has not already cached the image. Confirm the stored image reference, destination pull-secret references, successful pull, and application health. Include each supported architecture. A warm cache can hide a missing registry permission or incomplete mirror.

Keep the original reference and the verified destination reference in release records. If a rollout fails, those records help distinguish a bad rewrite from missing content, failed authentication, untrusted TLS, or an application problem without exposing credential material.
