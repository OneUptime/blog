# Technical review

Reviewed official EKS shared-responsibility and logging documentation, AWS CLI describe-cluster fields, AKS attestation categories, kubectl get, and tagged EKS benchmark definitions. Executed the pinned binary against its empty master and manual controlplane targets: zero results and two WARN records respectively. Checked all three shell examples, exercised the jq projection on a synthetic cloud response, and verified the read wrapper stops on a simulated forbidden request. The diagram and social image were reviewed.

No cloud service, real cluster API, or worker node was assessed. Local profile executions establish definition behavior only; API response and authorization tests used fixtures. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
