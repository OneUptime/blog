# Validation Summary: How to Build Right-Sizing Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (kubectl, Deployments, resource requests/limits)
- Python 3.9+ (dataclasses, enums, type hints with PEP 585 generics)
- Prometheus / metrics-server (referenced)
- AWS EC2 instance families (c7g, c6i, c6a, r7g, r6i, x2idn, m7g, m6i, m6a, i4i, d3, i3en, p5, p4d, g5)
- GCP Compute Engine instance families (c3, c2, c2d, m3, m2, n2-highmem, n2, n2d, e2, z3, a3, a2, g2)
- Azure VM instance families (Fsv2, Fx, Esv5, Edsv5, Msv2, Dsv5, Ddsv5, Dasv5, Lsv3, Lasv3, NCasT4_v3, NDasrA100_v4, NVadsA10_v5)
- Mermaid (graph, flowchart, sequenceDiagram, pie diagrams)
- YAML (Kubernetes manifests)

## Sources Consulted
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes resource management: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes metrics-server: https://github.com/kubernetes-sigs/metrics-server
- Kubernetes Deployment API reference (apps/v1): https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/
- AWS EC2 instance types: https://aws.amazon.com/ec2/instance-types/
- GCP Compute Engine machine families: https://cloud.google.com/compute/docs/machine-resource
- Azure VM sizes: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes
- Python dataclasses docs: https://docs.python.org/3/library/dataclasses.html
- Python PEP 585 (generic types in standard collections)
- Mermaid documentation: https://mermaid.js.org/

## Issues Found
No technical issues found.

The post's code, commands, configuration, and instance family references all check out:
- kubectl commands (`kubectl top pods --containers --no-headers`, `kubectl get pods -o custom-columns=...`, `kubectl patch deployment ... --type strategic`) are syntactically and semantically correct.
- The Kubernetes Deployment YAML uses the correct `apps/v1` API version and valid `resources.requests`/`resources.limits` schema.
- The Python parsing of `kubectl top --containers` output (POD, NAME, CPU, MEMORY columns) matches the actual output format.
- Nanocore-to-millicore conversion (dividing by 1,000,000) is mathematically correct.
- The percentile indexing (`sorted(samples)[int(len*0.95)]`) is safe given the `min_samples=100` guard.
- Every cited AWS / GCP / Azure instance family name corresponds to a real, generally-available family.
- 730 hours/month is the standard cloud-billing convention used across major providers.
- Mermaid syntax (including `subgraph X["Label"]` and `pie title`) is valid for current Mermaid versions.

## Review Notes
- `datetime.utcnow()` is used in several scripts. This call is deprecated in Python 3.12+ in favor of `datetime.now(timezone.utc)`. Code still runs, but a future revision could modernize it.
- The example pricing values in `cost_tracker.py` (e.g., `0.0255` USD/vCPU-hour for AWS us-east-1) are reasonable order-of-magnitude figures but should be treated as illustrative; real prices depend on instance family, reservation type, and region. The comment "Example pricing (varies by region and instance type)" already calls this out.
- The `rollback_change` method temporarily sets `max_change_percent = 100.0` and then restores it to a hardcoded `30.0`, which would lose any non-default value passed to the constructor. Not a correctness issue for the documented defaults but worth noting as a small robustness improvement.
- The instance-family Mermaid diagram in section 4 mixes AWS (c6i, c7g, r6i, etc.) with GCP examples (C2, N2-highmem, N2, A2) in single cells, which is consistent with the cross-cloud spirit of the section but could be clearer with provider labels.
