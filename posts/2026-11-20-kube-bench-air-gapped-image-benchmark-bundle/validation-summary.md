# Technical review

Reviewed official kube-bench v0.14.0 packaging and config selection, Crane v0.20.6 archive commands, and Kubernetes image behavior. Pulled the real AMD64 image by digest, validated its archive, exported its filesystem, and compared two bundled config files with tagged source. Imported it using the actual Crane binary into a local HTTP registry and validated the imported image. Investigated the digest change: manifest/config/layer media types changed from OCI to Docker representation while configuration and layer digests and sizes stayed identical. The article comparison passed real manifests and rejected a modified layer. Shell syntax, YAML and diagram structure passed review; image visually inspected.

No image execution, Linux node scan, runtime CA trust, production registry authentication or air-gap transfer was tested. The local registry was a loopback HTTP fixture. No publisher signature verification was performed. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
