# Validation Summary: How to Set Up Flagger with Istio on EKS Step by Step

## Status
validated

## Post Type
Tutorial / step-by-step implementation guide

## Technologies Covered
- Amazon EKS
- eksctl
- Kubernetes
- Istio
- Flagger
- Helm
- Prometheus
- Grafana
- podinfo

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- eksctl cluster creation documentation: https://docs.aws.amazon.com/eks/latest/eksctl/creating-and-managing-clusters.html
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio supported releases and Kubernetes compatibility: https://istio.io/latest/docs/releases/supported-releases/
- Istio installation configuration profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Flagger Istio canary deployments: https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Flagger canary resource behavior: https://docs.flagger.app/usage/how-it-works
- Flagger metrics analysis: https://docs.flagger.app/main/usage/metrics
- Flagger loadtester Helm chart: https://artifacthub.io/packages/helm/flagger/loadtester

## Issues Found
- The EKS cluster command used Kubernetes version 1.29, which is no longer listed as available for new EKS clusters as of 2026-05-13. Updated the example to Kubernetes 1.35, which is in EKS standard support.
- The prerequisite only said `istioctl` was installed, but the updated EKS version needs a compatible supported Istio release. Updated the prerequisite to `istioctl` 1.29.x.
- The cluster creation comment said "two managed node groups", but the command creates one managed node group. Corrected the comment.
- The Istio Prometheus add-on URL pointed to Istio release 1.22, which is outdated and not aligned with the supported Istio version used by the guide. Updated it to release 1.29.
- The sample application section said it created both a Deployment and Service, but the YAML only creates a Deployment. Corrected the wording.
- The Flagger canary referenced an external Istio gateway and host that the post never created, which would make the example depend on a missing resource. Removed the concrete gateway and host values and left a note to add them only after creating an Istio Gateway.
- The canary analysis used metrics but did not generate traffic during rollout. Added the Flagger loadtester Helm install and a load-test webhook so request success rate and duration checks have traffic to evaluate.
- The cleanup commands did not remove the loadtester release added for the corrected canary flow. Added `helm uninstall flagger-loadtester -n default`.

## Review Notes
The tutorial remains a demo-oriented setup. For production, readers should pin tool and chart versions, install Prometheus through their standard observability stack rather than relying on Istio sample add-ons, configure real DNS/TLS for external gateways, and review EKS extended-support costs before choosing a Kubernetes version.
