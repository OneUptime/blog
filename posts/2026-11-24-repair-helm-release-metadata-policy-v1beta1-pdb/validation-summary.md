# Technical validation

The repair workflow was exercised against disposable API storage with the official release binary. Metadata changes were measured independently from the live PDB.

## Checks performed

- Downloaded official mapkubeapis0.6.1 macOS ARM64 archive; verified SHA256 ed64c933075b23b1720e1cc08f46554ce7ef116fea7aab6b1d82af873f974b42 against release checksums; inspected executable help and tagged source
- Ran actual release binary against disposable Kubernetes1.34.0 API/etcd with a seeded deployed Helm Secret and a separate policy/v1 PDB
- Dry-run found the beta reference and preserved Secret count/resourceVersion; mutation superseded revision1 and created deployed revision2 with only expected manifest API replacement; live PDB UID/resourceVersion unchanged
- Repeated mapping created no additional revision; Helm3.17.3 history read both seeded/mapped records
- Article PDB-only map exactly matches executed fixture and official mapping entry; four shell blocks passed syntax; seven-node/seven-edge Mermaid structurally checked
- Generated1280x720 social image and visually inspected two-line title and branding without clipping

## Sources checked

- https://helm.sh/docs/v3/topics/kubernetes_apis/
- https://kubernetes.io/docs/reference/using-api/deprecation-guide/#poddisruptionbudget-v125
- https://helm.sh/docs/v3/helm/helm_history/
- https://helm.sh/docs/v3/helm/helm_get_manifest/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- https://github.com/helm/helm-mapkubeapis/blob/v0.6.1/pkg/v3/release.go
- https://github.com/helm/helm-mapkubeapis/releases/tag/v0.6.1
- https://github.com/helm/helm-mapkubeapis/blob/v0.6.1/plugin.yaml
- https://github.com/helm/helm-mapkubeapis/blob/v0.6.1/scripts/install_plugin.sh
- https://github.com/helm/helm-mapkubeapis/blob/v0.6.1/cmd/mapkubeapis/map.go
- https://github.com/helm/helm-mapkubeapis/blob/v0.6.1/config/Map.yaml
- https://github.com/helm/helm-mapkubeapis/blob/v0.6.1/pkg/common/common.go

## Limitations

- Fixture release metadata was seeded directly; no historical Helm installation or real application upgrade was executed
- No real workload, hook migration, rollback recovery, storage failure or drain tested; backup capture examples were source-reviewed and syntax-checked, not run against production
- Archive checksum comparison is not independent signature verification; plugin install hook was inspected rather than executed; Mermaid not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
