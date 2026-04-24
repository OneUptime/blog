# Validation Summary: How to Enable OPA Gatekeeper Policies with Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Open Policy Agent (OPA) Gatekeeper
- Helm
- Rego

## Sources Consulted
- Portainer kubectl shell: https://docs.portainer.io/user/kubernetes/kubectl
- Portainer Helm application flow: https://docs.portainer.io/user/kubernetes/applications/manifest/helm
- Portainer kubeconfig access: https://docs.portainer.io/sts/user/kubernetes/kubeconfig
- Gatekeeper installation: https://open-policy-agent.github.io/gatekeeper/website/docs/install/
- Gatekeeper ConstraintTemplates: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper how-to and constraint matching semantics: https://open-policy-agent.github.io/gatekeeper/website/docs/v3.16.x/howto/
- Gatekeeper audit behavior: https://open-policy-agent.github.io/gatekeeper/website/docs/audit
- Gatekeeper Library, Required Resources: https://open-policy-agent.github.io/gatekeeper-library/website/validation/containerresources/
- Gatekeeper Library, Privileged Container: https://open-policy-agent.github.io/gatekeeper-library/website/validation/privileged-containers/
- Gatekeeper Library, Allowed Images: https://open-policy-agent.github.io/gatekeeper-library/website/validation/allowedreposv2/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes Job controller docs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes CronJob controller docs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The Portainer UI path in the install section was outdated. I changed it from the old `Helm` flow and `KubeShell` terminology to the current `Applications` flow and `kubectl shell` wording used in Portainer docs.
- The Gatekeeper resource-limit, privileged-container, and allowed-registry Rego examples only inspected `input.review.object.spec.containers`. That works for Pods, but not for the Deployment, StatefulSet, DaemonSet, Job, and CronJob kinds the post claimed to cover. I updated the templates to read containers from Pod specs, Pod templates, and CronJob job templates so the examples match the stated resource kinds.
- The `K8sAllowedRegistries` `ConstraintTemplate` used `templates.gatekeeper.sh/v1` without a structural schema root type under `openAPIV3Schema`. I added `type: object`, which Gatekeeper requires for `v1` `ConstraintTemplate` parameter schemas.
- The testing section used a `backend` namespace that the post never created and reused the same Pod name for both the deny and allow test. I switched the examples to the existing `default` namespace and gave the Pods distinct names so the commands work as written.
- The phrase `audit mode` in the testing section implied `enforcementAction: dryrun`, but the sample constraints default to `deny`. I reworded that line to refer to viewing violations from audit instead.
- The monitoring command used an outdated selector (`control-plane=controller-manager`) instead of the current Gatekeeper deployment naming/labels, and `kubectl get constraints --all-namespaces -o wide` is unnecessary for cluster-scoped constraint resources. I replaced those commands with a current deployment log command and `kubectl get constraints`.

## Review Notes
- The post is technically relevant and is suitable for publication after correction.
- Gatekeeper's policy library contains maintained equivalents for the sample policies, but the post's custom `ConstraintTemplate` approach is still valid for instructional use once the object paths and schema are corrected.
- Gatekeeper documentation now also covers optional Rego v1 and Kubernetes-native validation engines, but the `rego:` examples in this post remain valid.
- `kubectl` and `helm` were not installed in this workspace, so command verification was performed against the official Kubernetes, Gatekeeper, and Portainer documentation rather than local `--help` output.
