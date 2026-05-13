# Validation Summary: How to Deploy AWS App Mesh Controller with Flux on EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS App Mesh
- AWS App Mesh Controller for Kubernetes
- Amazon EKS
- Flux
- Helm
- Kubernetes
- IAM Roles for Service Accounts (IRSA)
- AWS X-Ray tracing

## Sources Consulted
- AWS App Mesh Kubernetes getting started guide: https://docs.aws.amazon.com/app-mesh/latest/userguide/getting-started-kubernetes.html
- AWS App Mesh service mesh documentation and end-of-support notice: https://docs.aws.amazon.com/app-mesh/latest/userguide/meshes.html
- AWS App Mesh migration announcement: https://aws.amazon.com/blogs/containers/migrating-from-aws-app-mesh-to-amazon-ecs-service-connect/
- AWS App Mesh Controller Helm chart README and values: https://github.com/aws/eks-charts/tree/master/stable/appmesh-controller
- AWS App Mesh Controller API specification: https://aws.github.io/aws-app-mesh-controller-for-k8s/reference/api_spec/
- AWS App Mesh Controller tracing guide: https://aws.github.io/aws-app-mesh-controller-for-k8s/guide/tracing/
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://v2-7.docs.fluxcd.io/flux/guides/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/

## Issues Found
- The prerequisite specified EKS 1.25 or later, but Kubernetes 1.25 is no longer a currently supported EKS version. Changed the prerequisite to require a Kubernetes version currently supported by Amazon EKS.
- The post did not mention AWS App Mesh end of support or the new-customer onboarding restriction. Added a short note so readers understand the current service lifecycle status.
- The IRSA setup omitted the OIDC provider association step. Added the `eksctl utils associate-iam-oidc-provider` command before creating the IAM service account.
- The `eksctl create iamserviceaccount` example passed the two managed policy ARNs as repeated flags, while the AWS App Mesh guide documents them as a comma-separated value. Updated the command to match the official example.
- The tutorial installed the Helm chart but omitted the App Mesh CRDs, which AWS documents as a separate install step before creating App Mesh custom resources. Added Flux `GitRepository` and `Kustomization` manifests for the App Mesh CRD directory.
- The controller namespace was labeled for sidecar injection and mesh selection. Changed the namespace example so `appmesh-system` remains unlabeled and the application namespace carries both the mesh membership and sidecar injection labels.
- The Mesh `namespaceSelector` used the sidecar injection label as the mesh membership selector. Changed it to a separate `mesh: my-application-mesh` label so mesh membership and sidecar injection are not conflated.
- The Helm chart version used `1.12.*`, while the current EKS chart repository publishes App Mesh Controller chart `1.13.3`. Updated the HelmRelease example to `1.13.*` and the upgrade example to `1.13.3`.
- The sidecar injection command only added the injection label after the Mesh selector was corrected. Updated it to add both the mesh membership label and the injection label.

## Review Notes
The controller and CRD APIs used in the post remain `appmesh.k8s.aws/v1beta2`, and the Flux `HelmRepository`, `HelmRelease`, `GitRepository`, and `Kustomization` API versions are current. Existing App Mesh users should also verify IAM permissions for injected Envoy sidecars before relying on data plane traffic, especially when application pods use IRSA.
