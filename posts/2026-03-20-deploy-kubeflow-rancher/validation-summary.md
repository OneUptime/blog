# Validation Summary: How to Deploy Kubeflow on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Kubeflow 1.8.0 (manifests, Pipelines, Profiles, Notebooks, KServe, Katib)
- Rancher / Kubernetes (1.26+)
- kustomize (v5.x)
- Istio service mesh
- cert-manager
- Knative
- Kubeflow Pipelines v2 SDK (`kfp`)
- scikit-learn, pandas (used in the example pipeline)
- Longhorn (referenced as a StorageClass example)

## Sources Consulted
- Kubeflow manifests v1.8.0 README — https://github.com/kubeflow/manifests/blob/v1.8.0/README.md
- Kubeflow manifests v1.8.0 `example/kustomization.yaml` — https://github.com/kubeflow/manifests/tree/v1.8.0/example
- Kubeflow Profile API Go types (v1.8.0) — https://github.com/kubeflow/kubeflow/blob/v1.8.0/components/profile-controller/api/v1/profile_types.go
- kustomize install script — https://github.com/kubernetes-sigs/kustomize/blob/master/hack/install_kustomize.sh
- Kubeflow Pipelines v2 SDK docs (lightweight Python components, artifacts) — https://www.kubeflow.org/docs/components/pipelines/v2/components/lightweight-python-components/
- KFP SDK reference — https://kubeflow-pipelines.readthedocs.io/en/2.0.3/source/dsl.html

## Issues Found
- **KFP v2 pipeline example was broken** (Step 7). Multiple problems:
  1. `download_data` had no return value, so `download_task.output` would raise an `AttributeError` at compile time.
  2. The components passed plain string paths (`/tmp/data.csv`, `/tmp/model.pkl`) between containers. KFP runs each component in an isolated pod with its own filesystem, so files written in one container are not visible to the next; data must flow through artifact references (`Output[Dataset]` / `Input[Dataset]`).
  3. The `print(f"Model accuracy: {train_task.output}")` inside the `@dsl.pipeline`-decorated function only runs at compile time and prints a `PipelineParameterChannel` placeholder, not a runtime value — misleading.

  Fix: rewrote the pipeline to use the idiomatic KFP v2 pattern with `Input[Dataset]`/`Output[Dataset]`/`Output[Model]` artifact annotations, accessed inputs via `download_task.outputs['dataset']`, returned the accuracy as the pipeline's output, and removed the meaningless pipeline-level `print`. All other surrounding text and structure preserved.

## Review Notes
- Verified the `kustomize` install script URL, the Kubeflow manifests repo and `v1.8.0` tag, the `example/` directory, the `while ! kustomize build example | kubectl apply -f -` install pattern, the default Dex credentials (`user@example.com` / `12341234`), and the `Profile` CRD shape (`apiVersion: kubeflow.org/v1`, `kind: Profile`, `spec.resourceQuotaSpec`). All match upstream.
- The Kubeflow 1.8.0 README specifies kustomize **5.0.3** specifically; the post's `v5.0+` is acceptable but slightly more permissive than upstream guidance.
- Kubeflow 1.8.0 officially supports Kubernetes up to 1.26; the post's `1.26+` is technically slightly off-by-one with the upstream recommended ceiling, but in practice 1.26 is the supported version, and Rancher users may run newer releases successfully. Left as-is since this is a common deployment caveat and not a code/command error.
- v1.8.0 (Nov 2023) is now over two years old as of validation date (2026-05-03). Kubeflow has since moved to calendar-versioned releases. The post does not flag this; readers may want to consider a newer release for new deployments. Not a correctness issue, but worth noting for future updates.
- The upstream README uses `sleep 10` and the message `Retrying to apply resources`; the post uses `sleep 20` and `Retrying to apply resources...`. Functionally equivalent, left unchanged.
