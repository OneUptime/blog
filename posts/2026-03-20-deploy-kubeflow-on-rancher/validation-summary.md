# Validation Summary: How to Deploy Kubeflow on Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubeflow v1.8.0
- Kubeflow Pipelines (KFP) v2 SDK
- Rancher (Kubernetes management)
- Kubernetes (kubectl)
- Kustomize v5+
- Istio (ingress gateway)
- Longhorn (persistent storage)
- Dex (default authentication)
- KServe (model serving)
- Katib (hyperparameter tuning)

## Sources Consulted
- Kubeflow manifests repository: https://github.com/kubeflow/manifests
- Kubeflow v1.8.0 release notes and installation instructions
- Kubeflow Pipelines v2 SDK reference: https://kubeflow-pipelines.readthedocs.io/
- Kustomize installation script: https://github.com/kubernetes-sigs/kustomize (hack/install_kustomize.sh)
- Kubeflow Dex default credentials documentation
- Istio ingress gateway documentation

## Issues Found
No technical issues found.

All commands, code, and technical claims verified:
- The kustomize install script URL (`https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh`) is correct.
- The `kustomize build example | kubectl apply -f -` retry loop is the official installation pattern recommended by the Kubeflow manifests repo for handling CRD/resource ordering.
- The `example` directory exists at the root of the manifests repo at the v1.8.0 tag.
- The default Dex credentials (`user@example.com` / `12341234`) match the documented defaults.
- The Istio ingress port-forward command and ports (8080:80) are correct.
- The KFP v2 pipeline code is syntactically correct: `@dsl.component`, `@dsl.pipeline`, the `.output` accessor for single-return components, `Compiler().compile(pipeline_func, package_path)`, and `Client().create_run_from_pipeline_file()` are all valid v2 SDK APIs.
- The keyword-argument calling convention (`train_model(data_path=load_task.output)`) is required and correctly used in KFP v2.

## Review Notes
- Kubeflow v1.8.0 was released in November 2023. Newer versions (v1.9, v1.10) exist as of the review date — readers may wish to check the [latest manifests release](https://github.com/kubeflow/manifests/releases) for current versions, though the v1.8.0 install steps remain valid.
- The official Kubeflow v1.8 docs specifically pin kustomize to v5.0.3 for compatibility. The post says "v5+" which is generally fine, but very recent kustomize versions occasionally have edge-case rendering differences with older Kubeflow manifests.
- The `jupyter/tensorflow-notebook:latest` image referenced for Step 6 is a community Jupyter Docker Stacks image. For production Kubeflow notebooks, the Kubeflow project also publishes its own notebook server images that integrate better with the Kubeflow auth/PVC stack — but using the community image works for the tutorial.
- The post correctly notes that production deployments should use SSO (Rancher OIDC) rather than the default Dex static credentials. Worth emphasizing in a follow-up post on hardening.
