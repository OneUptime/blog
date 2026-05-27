# Validation Summary: How to Set Up Continuous Compliance Validation in GCP CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Google Cloud Platform
- Google Kubernetes Engine
- GKE Enterprise Policy Controller
- Open Policy Agent Gatekeeper
- Gator CLI
- Cloud Build
- Kubernetes manifests and constraints
- Rego

## Sources Consulted
- Google Cloud SDK reference: `gcloud container fleet policycontroller enable` - https://cloud.google.com/sdk/gcloud/reference/container/fleet/policycontroller/enable
- Google Cloud SDK reference: `gcloud container fleet policycontroller content templates enable` - https://cloud.google.com/sdk/gcloud/reference/container/fleet/policycontroller/content/templates/enable
- Google Cloud Policy Controller overview - https://cloud.google.com/kubernetes-engine/enterprise/policy-controller/docs/overview
- Google Cloud Policy Controller constraint template library reference - https://cloud.google.com/kubernetes-engine/policy-controller/docs/latest/reference/constraint-template-library
- Google Cloud Build GKE deploy builder documentation - https://cloud.google.com/build/docs/deploying-builds/deploy-gke
- Gatekeeper Gator CLI documentation - https://open-policy-agent.github.io/gatekeeper/website/docs/next/gator/
- Gatekeeper handling constraint violations documentation - https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Gatekeeper workload resource validation / ExpansionTemplate documentation - https://open-policy-agent.github.io/gatekeeper/website/docs/next/expansion/
- Gatekeeper latest release information - https://github.com/open-policy-agent/gatekeeper/releases

## Issues Found
- The Policy Controller template-library command used `content templates apply`, which is not a valid current gcloud subcommand. Changed it to `content templates enable` and included the membership location.
- The Policy Controller enable and template commands omitted `--location`. Added `--location=global` to make the membership examples self-contained.
- The Cloud Build Gator install steps extracted into `/workspace/bin/` without creating the directory first. Added `mkdir -p /workspace/bin`.
- The post pinned Gator to v3.14.0, whose docs are no longer actively maintained. Updated the download URL to v3.22.2, which is the current stable Gatekeeper release checked during review.
- The `gator verify` example incorrectly used `--filename`. `gator verify` takes suite paths, so the command was changed to `gator verify policies/tests/...`.
- The Gator test suite used paths that were incorrect relative to `policies/tests/suite.yaml`. Updated template, constraint, and object paths to match Gator's documented relative-path behavior.
- The Pod test object omitted `metadata.namespace`, which Gatekeeper documents as important for namespace-scoped objects in Gator tests. Added `namespace: default`.
- The built-in library constraints were shown matching Deployments, StatefulSets, and DaemonSets directly even though these Pod-scoped library policies operate on Pod-shaped resources unless workload expansion is configured. Updated the example constraints to match Pods and added a note about using `ExpansionTemplate` for workload resources.
- The custom `K8sRequiredLabels` template reused the same name and kind as the built-in Policy Controller library template while using a different parameter schema. Renamed it to `K8sRequiredLabelKeys` / `k8srequiredlabelkeys`.
- The custom label Rego assumed `metadata.labels` always exists. Updated it to use `object.get` so unlabeled objects are handled correctly.
- The pull request Cloud Build snippet installed Gator without setting executable permissions. Added `chmod +x /workspace/bin/gator`.

## Review Notes
The examples are now technically consistent with the documented gcloud and Gator command behavior. For future improvement, a complete production guide could include a full `ExpansionTemplate` example if the intended policy bundle must validate Pod templates inside Deployments, StatefulSets, DaemonSets, Jobs, and ReplicaSets during CI.
