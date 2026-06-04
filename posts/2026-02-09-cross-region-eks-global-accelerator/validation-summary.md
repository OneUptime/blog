# Validation Summary: How to Set Up Cross-Region EKS Clusters with Global Accelerator for Failover

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Kubernetes Deployments, Services, and Ingress
- AWS Load Balancer Controller
- AWS Global Accelerator
- Application Load Balancers
- Amazon Route 53
- Amazon RDS cross-Region read replicas
- Amazon DynamoDB global tables
- Amazon CloudWatch
- Terraform AWS provider
- AWS CLI and eksctl

## Sources Consulted
- AWS Global Accelerator Developer Guide: How AWS Global Accelerator works: https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html
- AWS Global Accelerator Developer Guide: Endpoint group health checks: https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoint-groups-health-check-options.html
- AWS Global Accelerator Developer Guide: Endpoint weights: https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoints-endpoint-weights.html
- AWS Global Accelerator Developer Guide: Traffic dials: https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoint-groups-traffic-dial.html
- AWS CLI Command Reference: globalaccelerator create-endpoint-group: https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/create-endpoint-group.html
- Amazon EKS User Guide: Install AWS Load Balancer Controller with Helm: https://docs.aws.amazon.com/eks/latest/userguide/lbc-helm.html
- eksctl User Guide: Creating and managing clusters: https://docs.aws.amazon.com/eks/latest/eksctl/creating-and-managing-clusters.html
- AWS CLI Command Reference: eks update-kubeconfig: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Kubernetes documentation: Ingress: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes documentation: Service: https://kubernetes.io/docs/concepts/services-networking/service/
- AWS CLI Command Reference: rds create-db-instance-read-replica: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance-read-replica.html
- Amazon RDS User Guide: Creating a read replica in a different AWS Region: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.XRgn.html
- Amazon DynamoDB Developer Guide: Global tables: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html
- AWS CLI Command Reference: dynamodb update-table: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-table.html
- AWS Global Accelerator Developer Guide: CloudWatch monitoring: https://docs.aws.amazon.com/global-accelerator/latest/dg/cloudwatch-monitoring.html
- Terraform Registry: aws_globalaccelerator_endpoint_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/globalaccelerator_endpoint_group

## Issues Found
- The Kubernetes Ingress referenced a `web-app` Service, but the deployment example did not create that Service. Added a matching Kubernetes Service on port 80 with `targetPort: 8080`.
- The tutorial used `kubectl --context=prod-east` and `kubectl --context=prod-west` without ensuring those context names existed. Added `aws eks update-kubeconfig --alias` commands after cluster creation.
- The AWS Load Balancer Controller installation used a placeholder manifest apply. Replaced it with the documented Helm install flow and IRSA service account creation commands for both clusters.
- The Route 53 architecture bullet mentioned health checks even though the tutorial uses Global Accelerator endpoint health and does not configure Route 53 health checks. Removed the health-check wording from the Route 53 bullet.
- The ALB ARN lookup used a partial DNS-name match derived with `cut`, which was brittle. Replaced it with exact `DNSName` matching in the `describe-load-balancers` query.
- The endpoint group creation commands did not capture `EAST_GROUP_ARN` and `WEST_GROUP_ARN`, but later commands used those variables. Updated the create commands to assign those variables from the command output.
- The endpoint group examples set Global Accelerator health-check interval and threshold options for ALB endpoints. AWS documents that Global Accelerator health-check options do not affect ALB or NLB endpoints; ELB target group health checks are used instead. Removed those options from the CLI and Terraform examples.
- The traffic distribution section used endpoint weights as if they split traffic across regional endpoint groups. AWS Global Accelerator endpoint weights apply within an endpoint group, while regional traffic control uses traffic dials. Updated the wording and commands to use `--traffic-dial-percentage` for regional traffic control.
- The RDS cross-Region read replica example used a source DB identifier suitable for same-Region replicas. Updated it to use a source DB ARN plus `--source-region`.
- The DynamoDB example used `create-global-table`, which AWS CLI documentation marks as the legacy 2017.11.29 global tables API. Replaced it with `update-table --replica-updates` for current global tables.
- The failover test used `curl http://$ACC_IPS[0]`, which is not valid for the string assigned by the AWS CLI command. Replaced it with a query that extracts the first accelerator IP into `ACC_IP`.
- The conclusion implied full regional redundancy without mentioning database failover requirements. Adjusted the wording to distinguish stateless application traffic failover from the need for a tested database failover plan.

## Review Notes
The tutorial is now technically coherent as a high-level implementation guide, but production use would still require filling in account-specific prerequisites such as IAM policy creation for the AWS Load Balancer Controller, DNS records, TLS certificates, database promotion/runbook details, and Terraform data sources/providers for the two regional ALBs.
