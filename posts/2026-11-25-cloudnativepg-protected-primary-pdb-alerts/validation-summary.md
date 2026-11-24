# Validation summary

Reviewed on 25 November 2026.

## Evidence and scope

CloudNativePG1.27.0 source confirms the separate primary selector and integer minimum, the replica budget condition, and the cnpg.io/instanceRole label. The article distinguishes a satisfied availability floor from permission to evict. Official kube-state-metrics2.16.0 definitions and Prometheus documentation support the metric and rule examples.

Prometheus3.7.3 promtool accepted the exact rule and published healthy-primary unit test. Seven extended scenarios passed: protected healthy primary with zero allowance, sustained unhealthy primary, brief readiness dip, recovery, replica deficit, unrelated PDB deficit, and missing data. Tests checked both pending-versus-firing timing and absence detection. They did not scrape a real exporter.

Both exact Kubernetes inspection blocks ran against a disposable Kubernetes1.34.0 API with the official CNPG1.27.0 Cluster CRD. A Cluster, three Pods, primary ownership reference and PDB status were explicit fixtures; no operator produced them. The promtool shell block also executed, and all three shell blocks passed bash syntax. The nine-node/seven-edge Mermaid diagram was structurally checked. The generated1280x720 social image was opened and visually reviewed; its three-line title fits without clipping.

## Limits

No live PostgreSQL, CNPG operator, kube-state-metrics exporter, Prometheus server, Alertmanager delivery, switchover or eviction ran. Synthetic samples establish rule behavior, not database health or deployment routing. API inspections establish command behavior on fixtures, not reconciliation timing. Mermaid was not rendered. The disposable API stopped and its kubeconfig was removed.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
