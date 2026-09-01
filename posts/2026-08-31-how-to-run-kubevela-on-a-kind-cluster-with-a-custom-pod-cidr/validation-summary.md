# Validation Summary: How to Run KubeVela on a kind Cluster with a Custom Pod CIDR

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- kind v0.31.0 and kind node images
- Kubernetes v1.31.14 Pod and Service networking
- Docker network inspection
- CoreDNS and kindnetd
- KubeVela v1.11.0 and the Open Application Model `Application` API
- Helm
- kubectl and the KubeVela `vela` CLI

## Sources Consulted
- kind cluster configuration — https://kind.sigs.k8s.io/docs/user/configuration/
- kind quick start, node-image selection, cluster creation, and deletion — https://kind.sigs.k8s.io/docs/user/quick-start/
- kind v0.31.0 release and Kubernetes v1.31.14 image digest — https://github.com/kubernetes-sigs/kind/releases/tag/v0.31.0
- kind v0.33.0 release and default node image — https://github.com/kubernetes-sigs/kind/releases/tag/v0.33.0
- kind local subnet clashes — https://kind.sigs.k8s.io/docs/user/known-issues/#local-subnet-clashes
- Docker `network ls` reference — https://docs.docker.com/reference/cli/docker/network/ls/
- Docker `network inspect` reference — https://docs.docker.com/reference/cli/docker/network/inspect/
- KubeVela v1.11 installation requirements and Helm commands — https://kubevela.io/docs/installation/kubernetes/
- KubeVela v1.11.0 release — https://github.com/kubevela/kubevela/releases/tag/v1.11.0
- KubeVela chart repository index — https://kubevela.github.io/charts/index.yaml
- KubeVela built-in component reference — https://kubevela.io/docs/end-user/components/references/
- KubeVela CLI references for `vela show`, `vela up`, `vela status`, and `vela port-forward` — https://kubevela.io/docs/cli/vela_show/ — https://kubevela.io/docs/cli/vela_up/ — https://kubevela.io/docs/cli/vela_status/ — https://kubevela.io/docs/cli/vela_port-forward/
- KubeVela v1.11 `webservice` definition and port-forward implementation — https://github.com/kubevela/kubevela/blob/v1.11.0/vela-templates/definitions/internal/component/webservice.cue — https://github.com/kubevela/kubevela/blob/v1.11.0/references/cli/portforward.go
- Helm `repo update` and `install` references — https://helm.sh/docs/helm/helm_repo_update/ — https://helm.sh/docs/helm/helm_install/
- Helm v3.6.3 `repo update` implementation — https://github.com/helm/helm/blob/v3.6.3/cmd/helm/repo_update.go
- Kubernetes cluster networking — https://kubernetes.io/docs/concepts/cluster-administration/networking/
- Kubernetes Service ClusterIP allocation — https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- Kubernetes `kubectl wait` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes patch-release support history — https://kubernetes.io/releases/patch-releases/#non-active-branch-history

## Issues Found
- The kind configuration did not pin a node image, so following it with the current kind v0.33.0 would create Kubernetes v1.37.0, outside KubeVela v1.11's documented maximum of v1.31. Added the Kubernetes v1.31.14 image and digest published with kind v0.31.0 to both nodes, identified the matching kind release, and moved the compatibility choice before cluster creation. Also noted that Kubernetes v1.31 is upstream end-of-life and this pairing is suitable only for the disposable lab.
- `docker network ls` lists networks but does not show their IPAM subnets, so it could not by itself support the instruction to check all Docker ranges for overlap. Added `docker network inspect` for all listed network IDs and stated that these diagnostics assume kind's Docker provider.
- The text said the `kubectl get service kubernetes` command inspects the Service range, but it displays one allocated ClusterIP rather than the CIDR boundaries. Changed the wording to say that the command confirms the built-in Service received an address from the intended CIDR.
- `helm repo update kubevela` is valid in current Helm, but KubeVela documents Helm v3.2.0 or later and older supported Helm 3 releases do not accept repository names on `repo update`. Changed it to the broadly compatible official-guide form, `helm repo update`.
- The Helm command used the literal placeholder `<tested-chart-version>`. In a shell, angle brackets are redirection syntax, so the block was not directly runnable. Replaced it with the published KubeVela chart version `1.11.0` and clarified that the example is version-pinned.
- The fallback text used `vela status --tree` without an Application name. KubeVela v1.11 requires the positional Application name, so changed it to `vela status hello-vela --tree`.
- The conclusion said the smoke test verifies Service discovery, but the shown commands create and port-forward a Service without performing an in-cluster DNS or Service-routing test. Changed the claim to Service creation.

## Review Notes
- The kind configuration schema, custom Pod and Service subnet fields, readiness checks, node CIDR query, kindnet log selector, cluster deletion commands, KubeVela Application API, `webservice` properties, standard Application label, and remaining Helm/`vela` commands matched the official documentation or v1.11 source.
- KubeVela v1.11 documents Kubernetes support only through v1.31, while Kubernetes v1.31 reached end of life on November 11, 2025. A future update should use a newer Kubernetes release once the selected KubeVela release officially supports one.
- The Docker daemon was unavailable in the review environment, so a live kind deployment was not run. The official KubeVela v1.11.0 CLI was checked locally, the Application YAML parsed successfully, and the published `vela-core` v1.11.0 chart passed `helm lint`; cluster-specific behavior was verified against official schemas, release notes, documentation, and tagged source.
