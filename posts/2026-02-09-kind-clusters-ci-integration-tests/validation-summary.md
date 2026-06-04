# Validation Summary: How to Build Integration Tests That Spin Up Kind Clusters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kind
- kubectl
- Go
- client-go
- OpenSSL
- Docker
- GitHub Actions
- GitLab CI

## Sources Consulted
- Kind Quick Start: https://kind.sigs.k8s.io/docs/user/quick-start/
- Kind Configuration docs: https://kind.sigs.k8s.io/docs/user/configuration/
- Kind Go cluster package: https://pkg.go.dev/sigs.k8s.io/kind/pkg/cluster
- Kubernetes Dynamic Admission Control docs: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Admission Controllers docs: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- GitHub actions/checkout releases and README: https://github.com/actions/checkout
- GitHub actions/setup-go README: https://github.com/actions/setup-go
- Helm kind-action releases: https://github.com/helm/kind-action/releases
- GitLab Docker-in-Docker documentation: https://docs.gitlab.com/ci/docker/using_docker_build/
- Go 1.25 release notes: https://go.dev/doc/go1.25

## Issues Found
- The Kind Linux install command used `v0.20.0`, which is outdated. Updated the local and GitLab CI install commands to `v0.32.0`, matching the current Kind quick-start release binary examples.
- The Go integration test imported `sigs.k8s.io/kind/pkg/cmd` without using it and used `metav1.ListOptions` without importing `k8s.io/apimachinery/pkg/apis/meta/v1`. Removed the unused import and added the missing `metav1` import.
- The webhook certificate only set the common name. Kubernetes webhook service certificates must be valid for `<service>.<namespace>.svc`, so the OpenSSL CSR now includes `subjectAltName=DNS:webhook.default.svc`, and the signing step copies the extension into the issued certificate.
- The webhook deployment referenced `localhost/webhook:test` while the build/load commands created `webhook:test`. Updated the Deployment image to `webhook:test` and set `imagePullPolicy: IfNotPresent`, matching Kind's documented local-image workflow.
- The parallel Go test used `time.Now()` without importing `time`. Added the missing import.
- The GitHub Actions workflow used outdated action tags (`actions/checkout@v2`, `actions/setup-go@v2`, `helm/kind-action@v1.8.0`) and an old Go version. Updated them to current supported examples: `actions/checkout@v6`, `actions/setup-go@v6`, `helm/kind-action@v1.14.0`, and Go `1.25`.
- The GitLab CI example used Docker-in-Docker without Docker client configuration and tried to assign the full kubeconfig contents to `KUBECONFIG`. Added `DOCKER_HOST`, disabled DinD TLS for the documented 2375 configuration, installed the Docker CLI, pinned the DinD service image, and changed the kubeconfig step to `kind export kubeconfig --name kind`.
- The failed-test log collection loop used `kubectl logs $pod -A`; `kubectl logs` accepts a specific pod resource and does not need `-A` for an already qualified `pod/<name>` resource. Quoted the pod variable and removed `-A`.

## Review Notes
- The Kind configuration uses `apiServerAddress: "0.0.0.0"`. Kind documents this as possible but strongly recommends keeping the API server bound to loopback for security. It was left unchanged because the snippet explicitly demonstrates custom networking and is not syntactically wrong.
- Some controller manifest paths and namespaces are project-specific examples. They may need adjustment for a real repository layout, but the Kubernetes and Kind mechanics are technically sound after the fixes.
