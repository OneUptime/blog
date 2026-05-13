# Validation Summary: How to Deploy Amazon MQ Broker Operator with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Amazon EKS
- Amazon MQ
- AWS Controllers for Kubernetes (ACK)
- ACK MQ controller
- Helm
- IAM Roles for Service Accounts (IRSA)
- eksctl
- AWS CLI

## Sources Consulted
- ACK MQ `Broker` API reference: https://aws-controllers-k8s.github.io/community/reference/mq/v1alpha1/broker/
- ACK Helm chart values reference: https://aws-controllers-k8s.github.io/docs/guides/helm-values/
- ACK self-managed Helm installation guide: https://aws-controllers-k8s.github.io/docs/getting-started-helm/
- ACK MQ controller release metadata: https://github.com/aws-controllers-k8s/mq-controller/releases
- Amazon MQ REST API reference for brokers: https://docs.aws.amazon.com/amazon-mq/latest/api-reference/brokers.html
- AWS CLI `mq create-broker` reference: https://docs.aws.amazon.com/cli/latest/reference/mq/create-broker.html
- Amazon MQ RabbitMQ deployment options: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-broker-architecture.html
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/guides/helmreleases/
- Flux Kustomization dependencies documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/#dependencies

## Issues Found
- The ACK MQ controller chart version was pinned to `1.0.10`, which is not a current MQ controller release tag. Updated the HelmRelease example to `1.2.3`, the latest ACK MQ controller release available during review.
- The IAM policy example included Amazon MQ actions but omitted the EC2 network-interface permissions required by Amazon MQ broker creation when not using the managed `AmazonMQFullAccess` policy. Added the documented EC2 permissions.
- The `Broker` example used `spec.brokerName`, but ACK's MQ `Broker` CRD uses `spec.name`. Updated the field name.
- The `Broker` example used `engineType: RabbitMQ`, but Amazon MQ and ACK use the enum value `RABBITMQ`. Updated the value.
- The RabbitMQ broker example included `storageType: efs`, but Amazon MQ does not support EFS storage for RabbitMQ brokers. Removed `storageType` from the RabbitMQ example.
- The RabbitMQ user example used `passwordSecretRef`, `consoleAccess`, and `groups`. ACK uses `users[].password` for Kubernetes Secret references, while `consoleAccess` and `groups` apply to ActiveMQ users and do not apply to RabbitMQ. Updated the Secret reference and removed the ActiveMQ-only fields from the RabbitMQ example.
- The optional ActiveMQ configuration section used a non-existent `BrokerConfiguration` custom resource. The ACK MQ controller exposes only the `Broker` CRD, so the section now shows how to reference an existing Amazon MQ configuration by `configuration.id` and `configuration.revision` from a valid ActiveMQ `Broker`.
- The ActiveMQ storage type example used lowercase `efs`; Amazon MQ storage type enum values are uppercase. Updated it to `EFS`.
- The Flux `dependsOn` example could be misread as depending on a HelmRelease named `ack-mq-controller`. Flux Kustomization dependencies refer to other Flux `Kustomization` objects, so a clarifying comment was added.

## Review Notes
- The Flux OCI `HelmRepository` example is valid, but Flux documentation notes that OCI `HelmRepository` is in maintenance mode and `OCIRepository` is preferred for improved OCI support.
- The IAM policy is intentionally minimal for tutorial purposes. Production deployments should validate least-privilege permissions against the ACK controller behavior and Amazon MQ networking requirements.
