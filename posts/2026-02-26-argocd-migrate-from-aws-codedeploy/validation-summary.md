# Validation Summary: How to Migrate from AWS CodeDeploy to ArgoCD

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- AWS CodeDeploy
- AWS ECS
- AWS EKS
- AWS CLI
- Kubernetes Deployments, Services, and Jobs
- Argo CD
- Argo Rollouts
- Kustomize
- GitHub Actions

## Sources Consulted
- AWS CodeDeploy AppSpec hooks documentation: https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html
- AWS CodeDeploy deployments documentation: https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments.html
- AWS CodeDeploy deployment configurations documentation: https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html
- AWS CodeDeploy service overview: https://docs.aws.amazon.com/codedeploy/latest/userguide/welcome.html
- AWS CLI CodeDeploy command reference: https://docs.aws.amazon.com/cli/latest/reference/deploy/index.html
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD getting started documentation: https://github.com/argoproj/argo-cd/blob/master/docs/getting_started.md
- Argo CD Application specification documentation: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo Rollouts blue-green documentation: https://argoproj.github.io/argo-rollouts/features/bluegreen/
- Argo Rollouts canary documentation: https://argoproj.github.io/argo-rollouts/features/canary/
- Argo Rollouts installation documentation: https://argo-rollouts.readthedocs.io/en/stable/installation/
- Kubernetes rolling update documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post implied CodeDeploy natively deploys to EKS. CodeDeploy supports EC2/on-premises, Lambda, and ECS, so I clarified that EKS usage would involve scripts or pipeline stages rather than native Kubernetes deployment support.
- The ECS AppSpec example used shell script paths for lifecycle hooks. AWS documents ECS CodeDeploy hooks as Lambda validation functions, so I replaced the script paths with Lambda hook function names.
- The hook mapping table treated CodeDeploy lifecycle hooks as direct Argo CD sync-phase equivalents. I changed the wording to describe the mapping as approximate and included Argo Rollouts analysis or promotion gates for traffic-shift-related hooks.
- The deployment strategy description conflated CodeDeploy deployment types with traffic shifting options. I clarified that in-place deployments apply to EC2/on-premises, while ECS and Lambda blue-green deployments can use all-at-once, linear, or canary traffic shifting.
- The Argo Rollouts examples did not mention that the Rollouts controller and CRDs must be installed before using `Rollout` resources. I added that prerequisite.
- The architecture comparison and CI explanation suggested Argo CD eliminates the whole pipeline. I clarified that Argo CD removes CodeDeploy from the deployment path while CI still builds artifacts and updates manifests.

## Review Notes
The remaining snippets are illustrative and assume surrounding setup such as AWS credentials, ECR authentication, Git identity configuration, repository checkout strategy, Argo CD access, and Argo Rollouts service and analysis templates. Those assumptions are reasonable for a migration guide, but a future version could make them explicit if the post is expanded into a fully runnable lab.
