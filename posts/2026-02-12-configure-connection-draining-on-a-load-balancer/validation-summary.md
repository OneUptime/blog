# Validation Summary: How to Configure Connection Draining on a Load Balancer

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Classic Load Balancer
- AWS Application Load Balancer
- AWS Network Load Balancer
- AWS CLI
- AWS CloudFormation
- Amazon EC2 Auto Scaling lifecycle hooks
- Amazon CloudWatch metrics
- Terraform AWS provider
- Python and Flask

## Sources Consulted
- AWS Classic Load Balancer connection draining documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/classic/config-conn-drain.html
- AWS CLI `elb modify-load-balancer-attributes` command reference: https://docs.aws.amazon.com/cli/latest/reference/elb/modify-load-balancer-attributes.html
- AWS CloudFormation `AWS::ElasticLoadBalancing::LoadBalancer ConnectionDrainingPolicy` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-elasticloadbalancing-loadbalancer-connectiondrainingpolicy.html
- AWS Application Load Balancer target group attribute documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
- AWS Network Load Balancer target group attribute documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html
- AWS CLI `elbv2 modify-target-group-attributes` command reference: https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-target-group-attributes.html
- AWS Application Load Balancer target health documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS Application Load Balancer CloudWatch metrics documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- Amazon EC2 Auto Scaling instance lifecycle documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-lifecycle.html
- Amazon EC2 Auto Scaling lifecycle hooks documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks-overview.html
- AWS CLI `autoscaling put-lifecycle-hook` command reference: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/put-lifecycle-hook.html
- Terraform AWS provider `aws_lb_target_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Python `signal` module documentation: https://docs.python.org/3/library/signal.html
- Flask quickstart routing documentation: https://flask.palletsprojects.com/en/stable/quickstart/#routing

## Issues Found
- The introduction described deregistration delay as an ALB-only term and implied the load balancer always cuts connections immediately without it. Updated the text to include NLBs and to clarify that the risk applies when draining is disabled or the delay is too low.
- The "without connection draining" section mixed deregistration and failed health checks. Updated it to focus on deregistration, which is the behavior governed by ALB/NLB deregistration delay.
- The Auto Scaling section incorrectly tied instance termination risk to the Auto Scaling cooldown period. Updated it to reflect that Auto Scaling deregisters terminating instances from Elastic Load Balancing and allows existing connections to continue until deregistration delay expires, while lifecycle hooks are useful for application-level shutdown work.
- The lifecycle hook explanation implied the hook simply adds time before a forceful termination. Updated it to describe the `Terminating:Wait` state and heartbeat extension behavior.
- The monitoring section claimed `UnHealthyHostCount` spikes correlate with draining. AWS documents that deregistration decreases `HealthyHostCount` but does not increase `UnHealthyHostCount`, so the recommendation was corrected.
- The Flask shutdown example claimed to close idle connections but exited immediately. Updated the example to mark the instance as draining via the health endpoint, wait briefly, and then exit.
- The health check pitfall incorrectly said ALB targets enter draining mode when health checks fail. Updated it to distinguish ALB `draining` state from `unhealthy` state.

## Review Notes
The AWS CLI, CloudFormation, and Terraform snippets are syntactically consistent with current official documentation. The local environment does not have the AWS CLI or Ruby installed, so AWS command validation was performed against official AWS CLI documentation instead of local `--help`, and the Ruby-based markdown check was skipped. The Python shutdown snippet was syntax-checked with `compile()`.
