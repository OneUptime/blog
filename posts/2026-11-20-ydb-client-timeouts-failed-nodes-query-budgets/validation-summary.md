# Validation review

Reviewed C++ SDKv3.27.0 request settings, retry settings, synchronous Query retry callback declarations and implementation. Traced MaxTimeout into a propagated deadline used for session acquisition and subsequent session requests. Confirmed MaxRetries, GetSessionClientTimeout, Idempotent and ClientTimeout names/namespaces against tagged headers. Reviewed gRPC deadline/keepalive scope and YDB uncertain-outcome guidance.

The example is source-reviewed only. No complete SDK build, database execution, failed-node simulation or timing experiment ran. The article does not promise a hard real-time return bound and identifies application queues, callbacks and cleanup as additional budget concerns. Read-only idempotency is not generalized to writes.

Mermaid structure passed with seven nodes and seven edges; it was not rendered. The generated1280x720 image was visually inspected and is readable without clipping. Live staged failure tests remain required for operational acceptance.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
