# Validation Summary: How to Integrate Flux CD with AWS CodePipeline

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Flux CD image reflector and image automation controllers
- AWS CodePipeline
- AWS CodeBuild
- Amazon ECR
- Amazon EKS and IRSA
- Kubernetes Deployments, CronJobs, Secrets, ServiceAccounts, and RBAC
- Docker image builds and registry authentication
- AWS CloudFormation

## Sources Consulted
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeBuild Docker-to-ECR sample: https://docs.aws.amazon.com/codebuild/latest/userguide/sample-docker.html
- AWS CodePipeline CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-codepipeline-pipeline.html
- AWS CodePipeline GitHub connections documentation: https://docs.aws.amazon.com/codepipeline/latest/userguide/connections-github.html
- AWS CodePipeline GitHub OAuth appendix: https://docs.aws.amazon.com/codepipeline/latest/userguide/appendix-github-oauth.html
- Amazon ECR private registry authentication: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Amazon EKS kubectl installation documentation: https://docs.aws.amazon.com/eks/latest/userguide/install-kubectl.html
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux AWS integration documentation: https://fluxcd.io/flux/integrations/aws/
- Flux CLI image commands documentation: https://fluxcd.io/flux/cmd/flux_get_images_policy/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ServiceAccount documentation: https://kubernetes.io/docs/concepts/security/service-accounts/

## Issues Found
- The CodeBuild `docker login` examples split the registry hostname onto a separate shell line after a pipe, which would cause the login command to run without the intended ECR registry and then try to execute the registry hostname as a command. Changed both examples to single-line ECR login commands matching AWS documentation.
- The long `docker build` examples relied on ambiguous YAML continuation. Changed them to folded YAML scalars so CodeBuild receives each build as one shell command.
- The CloudFormation pipeline omitted the required `ArtifactStore`. Added an S3 artifact bucket and wired it into the `AWS::CodePipeline::Pipeline` resource.
- The CloudFormation source action used the older GitHub OAuth action even though AWS recommends GitHub connections. Changed it to `CodeStarSourceConnection`, added a `ConnectionArn` parameter, and added `codestar-connections:UseConnection` permission.
- The Flux IRSA guidance used `eksctl create iamserviceaccount` against an already-installed Flux service account and did not show the Flux-documented `provider: aws` field on `ImageRepository`. Changed the instructions to annotate the existing `image-reflector-controller` service account, restart the controller, and configure `provider: aws`.
- The static ECR secret path was conflated with IRSA. Clarified that `secretRef` is for static credentials and `provider: aws` is for IRSA or node IAM.
- The semver `ImagePolicy` was shown after a commit-SHA tagging buildspec without explaining that it only matches semver tags. Added a note tying the policy to the semantic-versioning buildspec.
- The ECR token rotation CronJob lacked RBAC, an account ID environment variable, and a container with `kubectl` available. Added the service account, Role, RoleBinding, account ID env var, and a documented kubectl installation step.
- The token-rotation section implied all ECR integrations need rotation. Clarified that rotation is only needed for static ECR credential secrets, not Flux's AWS provider authentication.

## Review Notes
The post is technically relevant and salvageable. The examples are now aligned with current AWS and Flux documentation, but a production implementation should still tighten IAM and S3 permissions to specific resources rather than using broad wildcard permissions.
