# Validation Summary: How to Run Smoke Tests After Deployment with PostSync Hooks in ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD resource hooks: PostSync and SyncFail
- Kubernetes Jobs
- Kubernetes service DNS
- curl
- grpcurl
- Docker
- Python requests and pytest
- Argo CD CLI
- kubectl

## Sources Consulted
- Argo CD resource hooks and sync phases documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD automated sync documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD rollback command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- grpcurl official repository and Docker usage documentation: https://github.com/fullstorydev/grpcurl
- grpcurl official Dockerfile: https://github.com/fullstorydev/grpcurl/blob/master/Dockerfile
- curl official man page: https://curl.se/docs/manpage.html
- Requests quickstart and timeout documentation: https://requests.readthedocs.io/en/latest/user/quickstart/

## Issues Found
- The gRPC smoke test Job used `/bin/sh -c` inside `fullstorydev/grpcurl:latest`. The official grpcurl image uses a scratch-based final image with `/bin/grpcurl` as the entrypoint, so `/bin/sh` is not available. I changed the manifest to run two grpcurl containers using Kubernetes `args`, relying on the image entrypoint.
- The gRPC example did not mention grpcurl's descriptor requirement. grpcurl needs server reflection or supplied proto/protoset descriptors. I added a short note that the example assumes server reflection and that `-proto` or `-protoset` must be supplied otherwise.
- The Python readiness loop only caught `requests.exceptions.ConnectionError`. Because the example sets a request timeout, Requests can also raise `Timeout` and other `RequestException` subclasses. I changed the handler to catch `requests.exceptions.RequestException`.
- The automatic rollback text implied `argocd app rollback` was generally usable from a SyncFail hook. Argo CD documents that rollback cannot be performed for applications with automated sync enabled. I added that caveat and pointed automated-sync users toward Git revert-based rollback.

## Review Notes
- The Argo CD hook annotations, PostSync and SyncFail phase descriptions, `BeforeHookCreation` delete policy, Kubernetes Job fields, `argocd app rollback` command shape, curl usage, and service DNS examples are consistent with the referenced documentation.
- The rollback Job pins `argoproj/argocd:v2.9.0`; in real deployments, the CLI image should generally match the Argo CD server version in use.
