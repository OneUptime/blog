# Redesign Oversized Kubernetes ConfigMaps and Custom Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ConfigMap, Custom Resources, CRD, etcd, API Server, Storage

Description: Diagnose Kubernetes request and storage size failures, then move large payloads out of ConfigMaps and custom resources without losing integrity or safe rollout behavior.

---

Kubernetes API objects are control-plane metadata, not a general-purpose blob store. A roughly 3 MB manifest can fail before admission because the generic API server defaults to a 3 MiB maximum write-request body, enforced before object decoding. A smaller object can still fail later: ConfigMap data has a documented 1 MiB limit, and the default etcd maximum client request is 1.5 MiB. Encoding, metadata, admission mutations, and storage serialization mean there is no universal payload size just below one of those numbers that is guaranteed to fit.

The right repair is usually to make the Kubernetes object small and put the large artifact in storage designed for it. Raising one limit merely moves pressure to admission, etcd, watch caches, clients, and kubelets.

## Identify Which Boundary Rejected the Write

Capture the exact Status response and determine where it originated:

```bash
kubectl --request-timeout=30s --v=8 apply \
  --server-side --dry-run=server -f oversized.yaml
```

Use a sanitized manifest and do not enable verbose output for Secrets in shared logs. Server-side dry-run exercises admission and validation but skips persistence, so it cannot reproduce an etcd write-size rejection. For storage failures, inspect the original failed write response and API-server logs. Typical failure shapes across dry-run and actual writes include:

- HTTP `413 Request Entity Too Large` from an ingress, load balancer, or API request-body limit;
- an API validation error stating that a ConfigMap is too large;
- an etcd gRPC error such as `request is too large`; or
- an admission webhook denial after it adds fields or evaluates its own policy.

Test the kube-apiserver directly through an approved internal endpoint if a front proxy might impose a lower cap. Compare all API-server replicas; heterogeneous proxy or component settings can make the result intermittent.

Start by measuring both the source file and the client-rendered object:

```bash
wc -c oversized.yaml
kubectl create --dry-run=client -f oversized.yaml -o json |
  wc -c
```

The client-side dry-run output is a useful estimate, not the exact write request or stored record. Server defaulting and admission mutation happen later, and storage metadata is added by the API server. YAML comments do not enter the API object, but JSON field names, base64 data, labels, annotations, `managedFields`, and mutations do. Base64 expands binary content by roughly one third before JSON overhead.

Client-side apply normally stores the last-applied configuration annotation. Server-side apply tracks field ownership in `managedFields` and does not require that annotation at the API level, but current `kubectl` can preserve or update the annotation while migrating ownership or retaining downgrade compatibility. Inspect both annotations and `managedFields` instead of assuming either source of overhead is absent.

## Know the Independent Limits

Three boundaries are frequently confused:

1. The upstream generic API-server code defaults `MaxRequestBodyBytes` to `3 * 1024 * 1024` for write-request bodies before object decoding. A reverse proxy may use a smaller request-body limit.
2. Kubernetes explicitly limits ConfigMap data to 1 MiB. Individual Secrets also have a documented 1 MiB limit.
3. etcd defaults `--max-request-bytes` to 1,572,864 bytes. The final storage transaction includes more than the application's obvious payload.

These limits protect different components. Passing the HTTP limit does not promise that the object can be persisted. Passing a create does not make the design safe: every LIST, WATCH, cache, backup, admission call, and consumer may repeatedly copy or decode the object.

Do not change limits until you have identified the enforcing layer and benchmarked the complete control-plane path. Increasing etcd's value requires consistent client and server planning and lets a single key impose more latency on unrelated metadata.

## Redesign a Large ConfigMap

Choose a delivery mechanism based on the data's behavior:

- Build static application assets into a versioned container image.
- Store mutable large files in object storage or a database, then put an immutable URI, version, size, and cryptographic digest in Kubernetes.
- Use a CSI-backed or persistent volume when a mounted filesystem and local caching are required.
- Use a purpose-built configuration service for dynamic, centrally validated configuration.
- Split configuration into independently consumed logical units only when partial rollout and failure semantics are well defined.

A small reference ConfigMap can look like this:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pricing-rules-2026-09-04
  labels:
    app.kubernetes.io/name: pricing-api
data:
  uri: https://artifacts.example.net/pricing/rules-2026-09-04.json
  sha256: 2c7b8f4f1f0d8f22f0f53a66991d86554995aab4a489ae67f7e6512a9f61b98b
  size: "18432791"
  format: application/json
immutable: true
```

In production, authenticate the download, require TLS, pin the digest, impose a maximum download size, write to a temporary file, verify, then atomically rename it into use. Keep the last verified version for rollback. A URI without a digest turns an audited Kubernetes change into a mutable external dependency.

If configuration must exist before the app starts, an init container can fetch it into an `emptyDir`; a sidecar can refresh only if the application has explicit reload and rollback semantics. Do not place object-store credentials in the ConfigMap. Use a short-lived workload identity or a properly protected Secret.

Splitting one opaque blob across many ConfigMaps is a last resort. It increases object count, watch traffic, RBAC surface, and the risk of combining different versions. If chunks are unavoidable, use immutable versioned objects plus a small manifest that lists every chunk, size, order, and digest, and switch consumers only after the full set verifies.

## Redesign an Oversized Custom Resource

A custom resource should contain desired state, identifiers, and a compact status, not logs, generated manifests, inventories, model files, or an append-only history. Move the bulk data out and make the reference explicit:

```yaml
apiVersion: delivery.example.io/v1
kind: ReleaseBundle
metadata:
  name: checkout-2026-09-04
spec:
  artifact:
    uri: https://artifacts.example.net/releases/checkout-2026-09-04.tar
    sha256: 2c7b8f4f1f0d8f22f0f53a66991d86554995aab4a489ae67f7e6512a9f61b98b
    mediaType: application/vnd.example.release.v1+tar
    sizeBytes: 18432791
status:
  observedGeneration: 3
  resolvedDigest: sha256:2c7b8f4f1f0d8f22f0f53a66991d86554995aab4a489ae67f7e6512a9f61b98b
  conditions:
  - type: Ready
    status: "True"
    reason: ArtifactVerified
```

The controller should fetch only schemes and hosts allowed by policy, reject redirects to unexpected destinations, bound decompressed size, verify the digest and media type, and avoid logging credentials or artifact bodies. Record progress with conditions, counters, and a compact error summary. Put detailed execution logs in an observability or artifact system with retention controls.

Keep frequently changing status separate conceptually from a large desired-state payload. Although `/status` has its own update path, it is stored on the same object; repeated large status updates still amplify etcd revisions and watch traffic.

## Prevent Regression in the CRD Schema

Use OpenAPI schema constraints to reject oversized individual fields and collections before they become an operational incident:

```yaml
spec:
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              artifact:
                type: object
                required: [uri, sha256, mediaType, sizeBytes]
                properties:
                  uri:
                    type: string
                    maxLength: 2048
                  sha256:
                    type: string
                    pattern: '^[a-f0-9]{64}$'
                  mediaType:
                    type: string
                    maxLength: 255
                  sizeBytes:
                    type: integer
                    format: int64
                    minimum: 0
              inlineRules:
                type: array
                maxItems: 100
                items:
                  type: string
                  maxLength: 4096
```

Schema limits are part of the API contract. The excerpt constrains the relevant spec fields; a complete structural schema must also describe the retained status and every other supported field, or normal CRD pruning can remove undeclared data. Test existing objects before tightening constraints, version breaking changes deliberately, and remember that many individually valid fields can still form an oversized total object. Add controller-side and admission tests for complete encoded size as a defense in depth, not as a replacement for the platform limit.

## Migrate Without Breaking Consumers

Use a staged migration:

1. Inventory object size, consumers, watches, update rate, owners, and rollback needs.
2. Upload the payload to durable storage and verify size and digest independently.
3. Release consumers that understand both the legacy inline value and the new reference.
4. Patch a small cohort to the reference, observe downloads and reconciliation, then expand.
5. Stop writing inline data, remove it from objects, and confirm etcd and API-server memory trends.
6. After the rollback window, remove legacy reader code and old artifacts according to retention policy.

Use immutable, content-addressed artifact versions rather than overwriting a shared URL. Admission and controllers must never fetch untrusted remote content synchronously on the API request path; that couples write availability to external storage and opens server-side request risks.

## Verify the New Design

Test normal rollout, object-store outage, slow download, wrong digest, truncated content, decompression bomb, expired identity, rollback, and concurrent replicas. Confirm that:

- Kubernetes objects remain comfortably below all limits after defaulting and mutation;
- the controller does not download the same artifact on every reconcile;
- caches and nodes share verified content where appropriate;
- a failed fetch keeps the last known good state;
- status stays small and useful; and
- API latency, etcd proposal size, and watch traffic return to baseline.

## Conclusion

A 3 MB rejection is a design signal. First locate the HTTP, type-specific, admission, or etcd boundary. Then replace the inline blob with an immutable, authenticated, digest-pinned reference and keep custom-resource status compact. This reduces not only create size but the repeated cost paid by the entire Kubernetes control plane.

## Official Documentation

- [Kubernetes ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Kubernetes Secrets: Size Limit and Security](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes Custom Resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)
- [Kubernetes CRD Structural Schema and Validation](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)
- [Kubernetes Generic API Server Default Request Size](https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/apiserver/pkg/server/config.go)
- [etcd Configuration: max-request-bytes](https://etcd.io/docs/v3.6/op-guide/configuration/)
